
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
    model: "llama-v2",
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
      const response = await fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest),
        signal
      });

      if (!response.ok) {
        const responseText = await response.text();
        console.error('LLaMA API error response:', responseText);
        throw new Error(`LLaMA API request failed with status ${response.status}: ${responseText}`);
      }

      const responseText = await response.text();
      console.log('LLaMA API raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse API response as JSON:', responseText);
        throw new Error('Invalid JSON response from API');
      }

      console.log('Parsed LLaMA response:', data);

      // Check for the response in multiple possible locations
      let content = null;
      if (data.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (data.choices?.[0]?.text) {
        content = data.choices[0].text;
      } else if (data.response) {
        content = data.response;
      }

      if (!content) {
        console.error('Unexpected API response format:', data);
        throw new Error('No content found in API response');
      }

      content = content.trim();
      console.log('Content from LLaMA:', content);

      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON object found in content:', content);
        throw new Error('No JSON object found in response');
      }

      // Validate the JSON structure before returning
      let parsedJson;
      try {
        parsedJson = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('Failed to parse content as JSON:', jsonMatch[0]);
        throw new Error('Invalid JSON structure in response');
      }

      // Validate the structure
      if (!parsedJson.groups || !Array.isArray(parsedJson.groups)) {
        console.error('Invalid estimate structure:', parsedJson);
        throw new Error('Invalid estimate structure - missing or invalid groups array');
      }

      // Additional validation of the structure
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
