
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

async function getLocationContext(signal: AbortSignal): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/', { signal });
    const data = await response.json();
    return `Location context: ${data.city}, ${data.region}, ${data.country}. 
    Use local labor and material rates for this area. 
    Average labor rate in this area is approximately $${Math.round(data.latitude * 0.7 + 50)}/hour.`;
  } catch (error) {
    console.error('Error fetching location data:', error);
    return 'Using default national average rates for labor and materials.';
  }
}

function formatQuestionsToEstimateContext(
  category: string,
  questions: CategoryAnswers[]
): string {
  let formattedContext = `Project Category: ${category}\n\n`;
  formattedContext += "Project Details:\n";
  
  questions.forEach(catAnswers => {
    formattedContext += `${catAnswers.category}:\n`;
    catAnswers.questions.forEach(qa => {
      formattedContext += `- ${qa.question}: ${qa.answer}\n`;
    });
  });

  formattedContext += "\nPlease provide a detailed estimate with the following structure:\n";
  formattedContext += "1. Each group should represent a major category of work\n";
  formattedContext += "2. Each line item should include:\n";
  formattedContext += "   - Title\n";
  formattedContext += "   - Description\n";
  formattedContext += "   - Quantity\n";
  formattedContext += "   - Unit price\n";
  formattedContext += "   - Total\n";
  formattedContext += "3. Calculate accurate labor and material costs based on location\n";

  return formattedContext;
}

export async function generateLlamaResponse(
  context: string,
  imageUrl: string | undefined,
  llamaApiKey: string,
  signal: AbortSignal
): Promise<string> {
  const llamaAPI = new LlamaAI(llamaApiKey);
  
  // Get location-based pricing context
  const locationContext = await getLocationContext(signal);
  console.log('Location context:', locationContext);

  const apiRequest = {
    messages: [
      {
        role: "system",
        content: `You are a construction cost estimator. ${locationContext} Generate a detailed estimate with accurate local pricing.`
      },
      {
        role: "user",
        content: context
      }
    ],
    functions: [
      {
        name: "generate_construction_estimate",
        description: "Generate a detailed construction cost estimate with line items",
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
                    description: "Name of the work category (e.g., 'Site Work', 'Electrical', 'Plumbing')"
                  },
                  subgroups: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { 
                          type: "string",
                          description: "Subcategory name (e.g., 'Labor', 'Materials', 'Equipment')"
                        },
                        items: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              title: { 
                                type: "string",
                                description: "Name of the specific item or task"
                              },
                              description: { 
                                type: "string",
                                description: "Detailed description of the work to be performed"
                              },
                              quantity: { 
                                type: "number",
                                description: "Number of units"
                              },
                              unit: { 
                                type: "string",
                                description: "Unit of measurement (e.g., 'hours', 'sq ft', 'each')"
                              },
                              unitAmount: { 
                                type: "number",
                                description: "Cost per unit based on local rates"
                              },
                              totalPrice: { 
                                type: "number",
                                description: "Total cost (quantity * unitAmount)"
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
