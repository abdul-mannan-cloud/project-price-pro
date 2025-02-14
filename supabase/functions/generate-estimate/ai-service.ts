
// Import necessary types
import { CategoryAnswers } from "./types.ts";

async function getLocationContext(signal: AbortSignal): Promise<string> {
  try {
    const response = await fetch('https://ipapi.co/json/', { signal });
    const data = await response.json();
    return `Location: ${data.city}, ${data.region}, ${data.country}. Average labor rate in this area is approximately $${Math.round(data.latitude * 0.7 + 50)}/hour.`;
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
  const locationContext = await getLocationContext(signal);
  console.log('[AI Service] Location context:', locationContext);

  const systemPrompt = `You are an advanced contractor estimate generator. Generate a detailed project estimate in JSON format using the following rules:

1. Use contractor AI instructions and rates if provided in the context.
2. For pricing:
   - Use contractor address pricing if available
   - Otherwise use ${locationContext}
   - AI instructions & rates always override location-based pricing
3. Line items must:
   - Include unit abbreviation in title (e.g., "(LF)")
   - Valid units: CF, CY, DY, EA, GAL, HR, IN, LBS, LF, LS, MO, SF, SHT, SQ, SY, TONS, WK, WY, YD
   - Description must specify "Material + Labor", "Material", or "Labor"
   - Description must indicate pricing source (e.g., "Pricing: Contractor AI Instruction")
4. Final estimate must:
   - Meet minimum project cost from contractor settings
   - Apply markup percentage to unit prices
   - Apply tax rate to subtotal
   - Organize items into logical groups and subgroups
   - Include all required totals

Response must be valid JSON matching this structure:
{
  "projectTitle": "4 words or less",
  "summary": "Brief project summary",
  "groups": [{
    "groupName": "From Q&A category",
    "subgroups": [{
      "subgroupName": "Logical grouping",
      "lineItems": [{
        "title": "Item with unit (UNIT)",
        "description": "Details - Type (Pricing: Source)",
        "qty": number,
        "unitAmount": number,
        "lineTotal": number
      }]
    }]
  }],
  "subtotal": number,
  "tax": number,
  "total": number
}`;

  const messages = [
    {
      role: "system",
      content: systemPrompt
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

  console.log('[AI Service] Making OpenAI request with configuration:', {
    model: apiRequest.model,
    temperature: apiRequest.temperature,
    max_tokens: apiRequest.max_tokens,
    messageCount: messages.length,
    hasImage: !!imageUrl
  });

  try {
    console.log('[AI Service] Initiating OpenAI API call...');
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
      const errorText = await response.text();
      console.error('[AI Service] OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('[AI Service] OpenAI response received:', {
      status: 'success',
      hasChoices: !!data.choices,
      choiceCount: data.choices?.length
    });

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error('[AI Service] Invalid response format:', data);
      throw new Error('Invalid response format from OpenAI API');
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error('[AI Service] Error in generateEstimate:', error);
    throw new Error(`Failed to generate estimate: ${error.message}`);
  }
}

export function formatAnswersForContext(answers: Record<string, any>): CategoryAnswers[] {
  try {
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
  } catch (error) {
    console.error('[AI Service] Error formatting answers:', error);
    throw new Error(`Failed to format answers: ${error.message}`);
  }
}
