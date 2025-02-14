
// Import necessary types
import { CategoryAnswers } from "./types.ts";

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

export async function generateEstimate(
  context: string,
  imageUrl: string | undefined,
  openAIApiKey: string,
  signal: AbortSignal
): Promise<string> {
  // Get location-based pricing context
  const locationContext = await getLocationContext(signal);
  console.log('Location context:', locationContext);

  const messages = [
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
  ];

  if (imageUrl) {
    messages.push({
      role: "user",
      content: `Consider this image (${imageUrl}) in your estimate. Identify visible elements and include them in the calculation.`
    });
  }

  const apiRequest = {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 2000,
    stream: false
  };

  console.log('Making request to OpenAI API with:', JSON.stringify(apiRequest, null, 2));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Organization': 'proj_D9cnEkwnhuNTOLrxhTpnxgh3'
      },
      body: JSON.stringify(apiRequest),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
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
