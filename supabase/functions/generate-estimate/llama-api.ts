
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
  const systemPrompt = `You are a construction cost estimator AI. Generate a detailed estimate as a JSON object.

Follow this format exactly:
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

Important:
1. Return only JSON, no other text
2. Use numbers for all numeric values
3. Make sure totalPrice = quantity × unitAmount
4. Make sure subtotal = sum of item totalPrices
5. Make sure totalCost = sum of all subtotals`;

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

    console.log('LLaMA API response status:', response.status);
    
    const responseText = await response.text();
    console.log('LLaMA API raw response text:', responseText);

    if (!response.ok) {
      throw new Error(`LLaMA API request failed with status ${response.status}: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse LLaMA API response as JSON:', error);
      throw new Error(`Invalid JSON response from LLaMA API: ${responseText}`);
    }

    console.log('LLaMA API parsed response:', JSON.stringify(data, null, 2));

    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response structure from LLaMA API');
    }

    const choice = data.choices[0];
    if (!choice || !choice.message || typeof choice.message.content !== 'string') {
      console.error('Invalid choice structure:', choice);
      throw new Error('Invalid choice structure in LLaMA API response');
    }

    let content = choice.message.content.trim();
    console.log('Content from LLaMA:', content);

    // Try to extract JSON from the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in content:', content);
      throw new Error('No JSON object found in LLaMA API response');
    }

    content = jsonMatch[0];
    
    // Try to parse the JSON to validate it
    try {
      const parsed = JSON.parse(content);
      
      if (!parsed.groups || !Array.isArray(parsed.groups)) {
        console.error('Invalid parsed response:', parsed);
        throw new Error('Missing or invalid groups array in response');
      }

      // Check if we have any groups
      if (parsed.groups.length === 0) {
        console.error('No groups in response');
        throw new Error('No estimate groups generated');
      }

      // Return the valid JSON string
      return content;
    } catch (error) {
      console.error('Error parsing content as JSON:', error);
      throw new Error(`Invalid JSON structure in response: ${error.message}`);
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
