
// Import necessary types
import { CategoryAnswers } from "./types.ts";

// Initialize LlamaAI SDK
class LlamaAI {
  private apiKey: string;
  private baseUrl = 'https://api.llama-api.com';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async run(requestData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export async function generateLlamaResponse(
  context: string,
  imageUrl: string | undefined,
  llamaApiKey: string,
  signal: AbortSignal
): Promise<string> {
  const llamaAPI = new LlamaAI(llamaApiKey);

  const apiRequest = {
    messages: [
      {
        role: "system",
        content: "You are a construction cost estimator. Generate a detailed estimate in the specified JSON format."
      },
      {
        role: "user",
        content: context
      }
    ],
    functions: [
      {
        name: "generate_construction_estimate",
        description: "Generate a detailed construction cost estimate",
        parameters: {
          type: "object",
          properties: {
            groups: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  subgroups: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { type: "string" },
                              description: { type: "string" },
                              quantity: { type: "number" },
                              unit: { type: "string" },
                              unitAmount: { type: "number" },
                              totalPrice: { type: "number" }
                            },
                            required: ["title", "quantity", "unit", "unitAmount", "totalPrice"]
                          }
                        },
                        subtotal: { type: "number" }
                      },
                      required: ["name", "items", "subtotal"]
                    }
                  }
                },
                required: ["name", "subgroups"]
              }
            },
            totalCost: { type: "number" }
          },
          required: ["groups", "totalCost"]
        }
      }
    ],
    stream: false,
    function_call: "generate_construction_estimate"
  };

  if (imageUrl) {
    apiRequest.messages.push({
      role: "user",
      content: `Consider this image (${imageUrl}) in your estimate. Identify visible elements and include them in the calculation.`
    });
  }

  console.log('Making request to LLaMA API with:', JSON.stringify(apiRequest, null, 2));

  try {
    const response = await llamaAPI.run(apiRequest);
    console.log('LlamaAI response:', response);

    if (response.function_call?.arguments) {
      return response.function_call.arguments;
    }

    throw new Error('No function call arguments in response');
  } catch (error) {
    console.error('Error calling LlamaAI:', error);
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
