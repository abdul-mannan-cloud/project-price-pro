import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LLAMA_API_KEY = Deno.env.get('LLAMA_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, imageUrl, answers } = await req.json();

    console.log('Generating estimate for project:', { projectDescription, imageUrl, answers });

    const messages = [
      {
        role: "system",
        content: `You are an AI assistant that generates detailed cost estimates for construction projects.
        Generate line items grouped by category, including quantities and unit prices.
        Return a JSON object with line item groups, each containing detailed items with title, quantity, unit amount, and total price.`
      },
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLAMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    console.log('Generated estimate:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating estimate:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});