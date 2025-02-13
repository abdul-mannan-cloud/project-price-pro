
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
  digest: string;
}

export async function generateLlamaResponse(
  context: string,
  imageUrl: string | undefined,
  llamaApiKey: string,
  signal: AbortSignal
): Promise<string> {
  const systemPrompt = `You are a construction cost estimator. Generate a detailed estimate in JSON format.
Please provide a simple example estimate response following this structure:
{
  "groups": [
    {
      "name": "Labor",
      "subgroups": [
        {
          "name": "General Labor",
          "items": [
            {
              "title": "Construction Worker",
              "description": "General construction labor",
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

Rules:
1. Response must be valid JSON
2. Include only the JSON, no other text
3. All numbers must be actual numbers, not strings
4. Each item's totalPrice must be quantity * unitAmount
5. Each subgroup's subtotal must be the sum of its items' totalPrices
6. totalCost must be the sum of all subtotals`;

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
    stream: false,
    digest: "cef64461421c75d9a24d2660990a2dbc5e5f2526674b7acb2158aba0337f0f54"
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
      const errorText = await response.text();
      console.error('LLaMA API error response:', errorText);
      throw new Error(`LLaMA API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('LLaMA API raw response:', JSON.stringify(data, null, 2));

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format from LLaMA API');
    }

    let content = data.choices[0].message.content.trim();
    console.log('LLaMA API content:', content);

    // Try to extract JSON if there's any surrounding text
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        content = jsonMatch[0];
      }
    } catch (error) {
      console.error('Error extracting JSON:', error);
    }

    // Try to parse the response to validate JSON
    try {
      const parsed = JSON.parse(content);
      
      // Basic validation of required fields
      if (!parsed.groups || !Array.isArray(parsed.groups)) {
        throw new Error('Missing or invalid groups array');
      }

      if (typeof parsed.totalCost !== 'number') {
        throw new Error('Missing or invalid totalCost');
      }

      // Basic structure validation
      for (const group of parsed.groups) {
        if (!group.subgroups || !Array.isArray(group.subgroups)) {
          throw new Error('Invalid subgroups structure');
        }

        for (const subgroup of group.subgroups) {
          if (!subgroup.items || !Array.isArray(subgroup.items)) {
            throw new Error('Invalid items structure');
          }

          if (typeof subgroup.subtotal !== 'number') {
            throw new Error('Invalid subtotal');
          }
        }
      }

      return content;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error(`Invalid JSON in LLaMA API response: ${parseError.message}`);
    }
  } catch (error) {
    console.error('Error in generateLlamaResponse:', error);
    throw error;
  }
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
