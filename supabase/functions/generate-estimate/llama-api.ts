
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
    model: "llama-2-13b-chat",
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
      
      const url = 'https://api.llama-api.com/chat/completions';
      console.log('Making request to:', url);
      
      const response = await fetch(url, {
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
        console.error('API request failed:', response.status, responseText);
        throw new Error(`LLaMA API request failed with status ${response.status}: ${responseText}`);
      }

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('Successfully parsed response data:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('Failed to parse API response as JSON:', responseText);
        throw new Error(`Invalid JSON response from API: ${parseError.message}`);
      }

      // First try to extract text content from the response
      let content = null;
      
      // Try different response formats
      if (typeof data === 'string') {
        content = data;
      } else if (data.choices && Array.isArray(data.choices)) {
        const choice = data.choices[0];
        if (choice.message?.content) {
          content = choice.message.content;
        } else if (choice.text) {
          content = choice.text;
        } else if (typeof choice === 'string') {
          content = choice;
        } else {
          content = JSON.stringify(choice);
        }
      } else if (data.response) {
        content = data.response;
      } else if (data.output?.text) {
        content = data.output.text;
      } else if (data.generated_text) {
        content = data.generated_text;
      }

      console.log('Extracted raw content:', content);

      if (!content) {
        console.error('Could not extract content from response:', JSON.stringify(data, null, 2));
        throw new Error('Could not extract content from API response');
      }

      // Try to parse the content as JSON or extract JSON from it
      let estimateJson;
      
      try {
        // First try to parse the content directly as JSON
        estimateJson = JSON.parse(content);
      } catch {
        // If that fails, try to find a JSON object in the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('No JSON structure found in content:', content);
          throw new Error('No valid JSON structure found in response');
        }
        try {
          estimateJson = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse extracted JSON:', jsonMatch[0]);
          throw new Error('Failed to parse JSON structure from response');
        }
      }

      console.log('Parsed estimate JSON:', JSON.stringify(estimateJson, null, 2));
      
      // Validate the estimate structure
      if (!estimateJson.groups || !Array.isArray(estimateJson.groups)) {
        console.error('Invalid estimate structure:', estimateJson);
        throw new Error('Invalid estimate structure - missing or invalid groups array');
      }

      // Validate each group and subgroup
      for (const group of estimateJson.groups) {
        if (!group.subgroups || !Array.isArray(group.subgroups)) {
          console.error('Invalid group:', group);
          throw new Error('Invalid group structure - missing or invalid subgroups array');
        }
        for (const subgroup of group.subgroups) {
          if (!subgroup.items || !Array.isArray(subgroup.items)) {
            console.error('Invalid subgroup:', subgroup);
            throw new Error('Invalid subgroup structure - missing or invalid items array');
          }
          if (typeof subgroup.subtotal !== 'number') {
            console.error('Invalid subgroup subtotal:', subgroup);
            throw new Error('Invalid subgroup structure - missing or invalid subtotal');
          }
        }
      }

      if (typeof estimateJson.totalCost !== 'number') {
        console.error('Invalid total cost:', estimateJson.totalCost);
        throw new Error('Invalid estimate structure - missing or invalid totalCost');
      }

      return JSON.stringify(estimateJson);
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
