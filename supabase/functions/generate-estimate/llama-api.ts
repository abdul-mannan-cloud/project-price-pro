
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
  const systemPrompt = `You are a construction cost estimator. Create a detailed estimate for the project. Your response must be a valid JSON object with exactly this structure:

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
}

Only respond with the JSON, do not include any other text or explanations.`;

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
    max_tokens: 1200,  // Increased max tokens
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
          text: "Consider this image in your estimate. Identify visible elements and include them in the calculation. Respond only with JSON."
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
        // If response is not JSON, try to extract JSON from it
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[0]);
            console.log('Extracted and parsed JSON from response:', JSON.stringify(data, null, 2));
          } catch (extractError) {
            console.error('Failed to parse extracted JSON:', extractError);
            throw new Error('Could not parse JSON from response');
          }
        } else {
          console.error('No JSON found in response:', responseText);
          throw new Error('No JSON found in response');
        }
      }

      // Try to find the estimate in different response formats
      let content = null;

      // Try to extract content from various response structures
      if (data?.choices?.[0]?.message?.content) {
        content = data.choices[0].message.content;
      } else if (data?.choices?.[0]?.text) {
        content = data.choices[0].text;
      } else if (data?.response) {
        content = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
      } else if (typeof data === 'string') {
        content = data;
      } else if (typeof data?.content === 'string') {
        content = data.content;
      } else if (data?.message?.content) {
        content = data.message.content;
      } else if (data?.output?.text) {
        content = data.output.text;
      } else if (data?.generated_text) {
        content = data.generated_text;
      } else if (typeof data === 'object') {
        // If the response itself might be the estimate
        content = JSON.stringify(data);
      }

      if (!content) {
        throw new Error('Could not extract content from API response');
      }

      console.log('Extracted content:', content);

      let estimateJson;
      try {
        // Try to parse content as JSON
        estimateJson = typeof content === 'string' ? JSON.parse(content) : content;
      } catch (e) {
        // If that fails, try to find a JSON object in the content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('No JSON structure found in content:', content);
          throw new Error('No valid JSON structure found in response');
        }
        try {
          estimateJson = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse JSON from content:', jsonMatch[0]);
          throw new Error('Failed to parse valid JSON from response');
        }
      }

      console.log('Parsed estimate JSON:', JSON.stringify(estimateJson, null, 2));

      // Create a default estimate structure if the response is incomplete
      const defaultEstimate = {
        groups: [
          {
            name: "Labor and Materials",
            subgroups: [
              {
                name: "General Work",
                items: [
                  {
                    title: "General Labor",
                    description: "Construction work",
                    quantity: 1,
                    unit: "job",
                    unitAmount: 1000,
                    totalPrice: 1000
                  }
                ],
                subtotal: 1000
              }
            ]
          }
        ],
        totalCost: 1000
      };

      // Merge the response with default structure to ensure valid format
      const validatedEstimate = {
        groups: (estimateJson.groups || []).map(group => ({
          name: group.name || "Unnamed Group",
          subgroups: (group.subgroups || []).map(subgroup => ({
            name: subgroup.name || "Unnamed Subgroup",
            items: (subgroup.items || []).map(item => ({
              title: item.title || "Unnamed Item",
              description: item.description || "",
              quantity: typeof item.quantity === 'number' ? item.quantity : 1,
              unit: item.unit || "unit",
              unitAmount: typeof item.unitAmount === 'number' ? item.unitAmount : 0,
              totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : 0
            })),
            subtotal: typeof subgroup.subtotal === 'number' ? subgroup.subtotal : 
              (subgroup.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0)
          }))
        }))
      };

      // Calculate total cost if not provided or invalid
      validatedEstimate.totalCost = validatedEstimate.groups.reduce((total, group) => 
        total + group.subgroups.reduce((groupTotal, subgroup) => 
          groupTotal + subgroup.subtotal, 0), 0);

      // If the estimate is empty, use the default
      if (validatedEstimate.groups.length === 0) {
        return JSON.stringify(defaultEstimate);
      }

      return JSON.stringify(validatedEstimate);
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
