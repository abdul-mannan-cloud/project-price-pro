// Import necessary types
import { CategoryAnswers } from "./types.ts";

// Initialize LlamaAI SDK
class LlamaAI {
  private apiKey: string;
  private baseUrl = 'https://api.llama-api.com/v1'; // Updated API endpoint

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async run(requestData: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, { // Updated endpoint path
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
    model: "llama-2-70b-chat", // Specify the model explicitly
    messages: [
      {
        role: "system",
        content: `You are a construction cost estimator. Generate a detailed estimate following these rules:
        1. Use the provided AI instructions and rates as the primary source for pricing
        2. If no specific rates are provided, use ${locationContext}
        3. Structure the response as a JSON with groups, subgroups, and line items
        4. Each line item must include title, description, quantity, unit amount, and total price
        5. Group similar items together under appropriate categories
        6. Be specific with descriptions and include labor and material breakdowns where applicable`
      },
      {
        role: "user",
        content: context
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
    stream: false
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

    if (!response.choices || !response.choices[0]?.message?.content) {
      throw new Error('Invalid response format from LLaMA API');
    }

    return response.choices[0].message.content;
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
