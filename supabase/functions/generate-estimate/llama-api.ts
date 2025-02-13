
import { CategoryAnswers } from "./types.ts";

interface LlamaMessage {
  role: "system" | "user";
  content: string;
}

interface LlamaFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

interface LlamaRequest {
  messages: LlamaMessage[];
  functions: LlamaFunction[];
  stream: boolean;
  function_call: string;
}

export async function generateLlamaResponse(
  context: string,
  imageUrl: string | undefined,
  llamaApiKey: string,
  signal: AbortSignal
): Promise<string> {
  const estimateFunction: LlamaFunction = {
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
              name: {
                type: "string",
                description: "Name of the group (e.g., 'Labor and Materials')"
              },
              subgroups: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the subgroup (e.g., 'Construction Labor')"
                    },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                            description: "Title of the item"
                          },
                          description: {
                            type: "string",
                            description: "Description of the work"
                          },
                          quantity: {
                            type: "number",
                            description: "Quantity of units"
                          },
                          unit: {
                            type: "string",
                            description: "Unit of measurement"
                          },
                          unitAmount: {
                            type: "number",
                            description: "Cost per unit"
                          },
                          totalPrice: {
                            type: "number",
                            description: "Total cost for this item"
                          }
                        },
                        required: ["title", "quantity", "unit", "unitAmount", "totalPrice"]
                      }
                    },
                    subtotal: {
                      type: "number",
                      description: "Total cost for this subgroup"
                    }
                  },
                  required: ["name", "items", "subtotal"]
                }
              }
            },
            required: ["name", "subgroups"]
          }
        },
        totalCost: {
          type: "number",
          description: "Total cost for the entire project"
        }
      },
      required: ["groups", "totalCost"]
    }
  };

  const apiRequest: LlamaRequest = {
    messages: [
      {
        role: "system",
        content: "You are a construction cost estimator. Based on the project details, generate a detailed cost estimate."
      },
      {
        role: "user",
        content: context
      }
    ],
    functions: [estimateFunction],
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
  
  let retries = 3;
  while (retries > 0) {
    try {
      const headers = {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      console.log('Using API key (first 10 chars):', llamaApiKey.substring(0, 10));
      
      const response = await fetch('https://api.llama-api.com/run', {
        method: 'POST',
        headers,
        body: JSON.stringify(apiRequest),
        signal
      });

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        throw new Error(`LLaMA API request failed with status ${response.status}: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(data, null, 2));

      // The response should contain a function call with arguments
      if (data.function_call?.arguments) {
        return data.function_call.arguments;
      }

      throw new Error('No function call arguments in response');
    } catch (error) {
      console.error(`Attempt ${4 - retries} failed:`, error);
      retries--;
      if (retries === 0) {
        throw error;
      }
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
