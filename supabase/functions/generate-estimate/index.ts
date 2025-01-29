import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, imageUrl, answers } = await req.json();
    console.log('Generating estimate for:', { projectDescription, imageUrl, answers });

    const systemPrompt = `You are an AI assistant that generates detailed cost estimates for construction projects.
    Generate line items grouped by category, including quantities and unit prices.
    Return a JSON object with this exact structure:
    {
      "groups": [
        {
          "name": "string",
          "items": [
            {
              "title": "string",
              "quantity": number,
              "unitAmount": number,
              "totalPrice": number
            }
          ]
        }
      ],
      "totalCost": number
    }`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate a detailed estimate for this project:
            Description: ${projectDescription}
            Customer Responses: ${JSON.stringify(answers, null, 2)}`
          },
          imageUrl ? {
            type: "image_url",
            image_url: imageUrl
          } : null
        ].filter(Boolean)
      }
    ];

    console.log('Sending request to OpenAI with messages:', messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from OpenAI');
    }

    const estimateData = JSON.parse(data.choices[0].message.content);
    console.log('Parsed estimate:', estimateData);

    return new Response(JSON.stringify(estimateData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating estimate:', error);
    return new Response(JSON.stringify({
      error: error.message,
      groups: [
        {
          name: "Labor",
          items: [
            {
              title: "Initial Assessment",
              quantity: 1,
              unitAmount: 150,
              totalPrice: 150
            }
          ]
        }
      ],
      totalCost: 150
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});