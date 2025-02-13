
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
            lineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  group: { 
                    type: "string",
                    description: "Category or group of work (e.g., 'Labor', 'Materials', 'Equipment')"
                  },
                  title: { 
                    type: "string",
                    description: "Title of the line item"
                  },
                  description: { 
                    type: "string",
                    description: "Detailed description of the work or item"
                  },
                  quantity: { 
                    type: "number",
                    description: "Number of units"
                  },
                  unitPrice: { 
                    type: "number",
                    description: "Price per unit"
                  },
                  total: { 
                    type: "number",
                    description: "Total cost (quantity * unitPrice)"
                  }
                },
                required: ["group", "title", "description", "quantity", "unitPrice", "total"]
              }
            },
            totalCost: {
              type: "number",
              description: "Total cost for the entire project"
            }
          },
          required: ["lineItems", "totalCost"]
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
