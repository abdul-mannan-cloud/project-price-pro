
import { CategoryAnswers } from "./types.ts";

interface LlamaMessage {
  role: "system" | "user";
  content: string | Array<{ type: string; [key: string]: any }>;
}

interface LlamaRequest {
  messages: LlamaMessage[];
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  stream: boolean;
}

export async function generateLlamaResponse(
  context: string,
  imageUrl: string | undefined,
  llamaApiKey: string,
  signal: AbortSignal
): Promise<string> {
  const systemPrompt = `You are a construction cost estimator. Create a detailed estimate for the project. Respond with a valid JSON object using exactly this format:

{
  "groups": [
    {
      "name": "Labor and Materials",
      "subgroups": [
        {
          "name": "Construction Labor",
          "items": [
            {
              "title": "General Labor",
              "description": "Construction work",
              "quantity": 40,
              "unit": "hours",
              "unitAmount": 45,
              "totalPrice": 1800
            }
          ],
          "subtotal": 1800
        }
      ]
    }
  ],
  "totalCost": 1800
}`;

  const apiRequest: LlamaRequest = {
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: context
      }
    ],
    model: "llama-2-70b-chat",  // Updated model name
    max_tokens: 800,
    temperature: 0.1,
    top_p: 1.0,
    frequency_penalty: 0.5,
    presence_penalty: 0.0,
    stream: false
  };

  if (imageUrl) {
    apiRequest.messages.splice(1, 0, {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: imageUrl
        },
        {
          type: "text",
          text: "Consider this image in your estimate. Identify visible elements and include them in the calculation."
        }
      ]
    });
  }

  console.log('Making request to LLaMA API with:', JSON.stringify(apiRequest, null, 2));
  
  let retries = 3;
  while (retries > 0) {
    try {
      const headers = {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      console.log('Using API key (first 10 chars):', llamaApiKey.substring(0, 10));
      
      const response = await fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(apiRequest),
        signal
      });

      const responseText = await response.text();
      console.log('Raw response status:', response.status);
      console.log('Raw response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Raw response text:', responseText);

      if (!response.ok) {
        throw new Error(`LLaMA API request failed with status ${response.status}: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse API response as JSON:', responseText);
        throw new Error(`Invalid JSON response from API: ${parseError.message}`);
      }

      console.log('Parsed response data:', JSON.stringify(data, null, 2));

      // Check various possible response formats
      const content = data.choices?.[0]?.message?.content || 
                     data.choices?.[0]?.text || 
                     data.response || 
                     data.generated_text ||
                     data.output?.text;

      if (!content) {
        console.error('Response structure:', JSON.stringify(data, null, 2));
        throw new Error('No content found in API response');
      }

      console.log('Extracted content:', content);

      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON object found in content:', content);
        throw new Error('No JSON object found in response');
      }

      const parsedJson = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!parsedJson.groups || !Array.isArray(parsedJson.groups)) {
        console.error('Invalid estimate structure:', parsedJson);
        throw new Error('Invalid estimate structure - missing or invalid groups array');
      }

      for (const group of parsedJson.groups) {
        if (!group.subgroups || !Array.isArray(group.subgroups)) {
          throw new Error('Invalid group structure - missing or invalid subgroups array');
        }
        for (const subgroup of group.subgroups) {
          if (!subgroup.items || !Array.isArray(subgroup.items)) {
            throw new Error('Invalid subgroup structure - missing or invalid items array');
          }
          if (typeof subgroup.subtotal !== 'number') {
            throw new Error('Invalid subgroup structure - missing or invalid subtotal');
          }
        }
      }

      if (typeof parsedJson.totalCost !== 'number') {
        throw new Error('Invalid estimate structure - missing or invalid totalCost');
      }

      return jsonMatch[0];
    } catch (error) {
      console.error(`Attempt ${4 - retries} failed:`, error);
      retries--;
      if (retries === 0) {
        throw error;
      }
      // Wait for 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('All retries failed');
}

export function formatAnswersForContext(answers: Record<string, any>): CategoryAnswers[] {
  return Object.entries(answers || {}).map(([category, categoryAnswers]) => {
    const questions = Object.entries(categoryAnswers || {}).map(([_, qa]) => ({
      question: qa.question,
      answer: qa.answers.map((ans: string) => {
        const option = qa.options.find((opt: any) => opt.value === ans);
        return option ? option.label : ans;
      }).join(', ')
    }));
    return { category, questions };
  });
}
