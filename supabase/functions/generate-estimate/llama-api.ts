
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
  const systemPrompt = `You are a construction cost estimator AI. Your task is to generate a detailed cost estimate in JSON format based on the provided context. Always follow these rules:

1. Use this EXACT format:
{
  "groups": [
    {
      "name": "Category Name",
      "subgroups": [
        {
          "name": "Subcategory Name",
          "items": [
            {
              "title": "Item Name",
              "description": "Item Description",
              "quantity": 1,
              "unit": "units",
              "unitAmount": 100,
              "totalPrice": 100
            }
          ],
          "subtotal": 100
        }
      ]
    }
  ],
  "totalCost": 100
}

2. IMPORTANT RULES:
- Return ONLY the JSON object, no explanations or text before or after
- All numbers must be actual numbers, not strings
- Ensure each field has a value
- Total price = quantity × unit amount
- Subtotal = sum of all item total prices
- Total cost = sum of all subtotals`;

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

    if (!data.choices?.[0]?.message?.content) {
      console.error('Unexpected API response format:', data);
      throw new Error('Invalid response format from LLaMA API: missing content in response');
    }

    let content = data.choices[0].message.content.trim();
    console.log('Raw content from LLaMA:', content);

    // Try to extract JSON if there's any surrounding text
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON object found in response');
      throw new Error('No valid JSON found in LLaMA API response');
    }

    content = jsonMatch[0];
    console.log('Extracted JSON content:', content);

    // Validate JSON structure
    const parsed = JSON.parse(content);
    
    // Validate required fields and structure
    if (!Array.isArray(parsed.groups)) {
      throw new Error('Missing or invalid groups array');
    }

    if (typeof parsed.totalCost !== 'number') {
      throw new Error('Missing or invalid totalCost');
    }

    // Validate each group and its structure
    for (const group of parsed.groups) {
      if (!group.name || typeof group.name !== 'string') {
        throw new Error('Invalid group name');
      }

      if (!Array.isArray(group.subgroups)) {
        throw new Error('Invalid subgroups array');
      }

      for (const subgroup of group.subgroups) {
        if (!subgroup.name || typeof subgroup.name !== 'string') {
          throw new Error('Invalid subgroup name');
        }

        if (!Array.isArray(subgroup.items)) {
          throw new Error('Invalid items array');
        }

        if (typeof subgroup.subtotal !== 'number') {
          throw new Error('Invalid subgroup subtotal');
        }

        for (const item of subgroup.items) {
          if (!item.title || typeof item.title !== 'string') {
            throw new Error('Invalid item title');
          }
          if (typeof item.quantity !== 'number') {
            throw new Error('Invalid item quantity');
          }
          if (!item.unit || typeof item.unit !== 'string') {
            throw new Error('Invalid item unit');
          }
          if (typeof item.unitAmount !== 'number') {
            throw new Error('Invalid item unitAmount');
          }
          if (typeof item.totalPrice !== 'number') {
            throw new Error('Invalid item totalPrice');
          }
        }
      }
    }

    return content;
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
