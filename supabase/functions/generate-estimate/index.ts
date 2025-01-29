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

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('LLAMA_API_KEY is not set');
    }

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

    console.log('Sending request to Llama with messages:', messages);

    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`Llama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Llama response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Llama');
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