
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
        // If response is not JSON, try to use it directly
        data = responseText;
        console.log('Using raw response text as data');
      }

      // Try different ways to extract content
      let content: string | null = null;

      if (typeof data === 'string') {
        content = data;
      } else if (typeof data?.content === 'string') {
        content = data.content;
      } else if (data?.message?.content) {
        content = data.message.content;
      } else if (data?.choices && Array.isArray(data.choices) && data.choices.length > 0) {
        const choice = data.choices[0];
        if (typeof choice === 'string') {
          content = choice;
        } else if (choice?.message?.content) {
          content = choice.message.content;
        } else if (choice?.text) {
          content = choice.text;
        } else if (choice?.content) {
          content = choice.content;
        } else {
          content = JSON.stringify(choice);
        }
      } else if (data?.response) {
        content = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
      } else if (data?.result) {
        content = typeof data.result === 'string' ? data.result : JSON.stringify(data.result);
      } else if (data?.output?.text) {
        content = data.output.text;
      } else if (data?.generated_text) {
        content = data.generated_text;
      } else if (typeof data === 'object') {
        // If nothing else works, try to use the entire response
        content = JSON.stringify(data);
      }

      console.log('Extracted content type:', typeof content);
      console.log('Extracted content:', content);

      if (!content) {
        throw new Error(`Could not extract content from API response. Full response: ${JSON.stringify(data)}`);
      }

      // Try to find a JSON object in the content
      const jsonMatches = content.match(/\{[\s\S]*?\}/g);
      console.log('Found JSON matches:', jsonMatches);

      if (!jsonMatches) {
        throw new Error('No JSON objects found in the response content');
      }

      // Try each JSON object found
      let validEstimate = null;
      for (const jsonStr of jsonMatches) {
        try {
          const parsedJson = JSON.parse(jsonStr);
          console.log('Attempting to validate JSON structure:', parsedJson);

          // Validate the structure
          if (parsedJson.groups && Array.isArray(parsedJson.groups)) {
            let isValid = true;
            
            for (const group of parsedJson.groups) {
              if (!group.subgroups || !Array.isArray(group.subgroups)) {
                isValid = false;
                break;
              }
              
              for (const subgroup of group.subgroups) {
                if (!subgroup.items || !Array.isArray(subgroup.items) || typeof subgroup.subtotal !== 'number') {
                  isValid = false;
                  break;
                }
              }
              
              if (!isValid) break;
            }

            if (isValid && typeof parsedJson.totalCost === 'number') {
              validEstimate = parsedJson;
              break;
            }
          }
        } catch (e) {
          console.log('Failed to parse or validate JSON match:', e);
          continue;
        }
      }

      if (!validEstimate) {
        throw new Error('No valid estimate structure found in any JSON object');
      }

      return JSON.stringify(validEstimate);
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
