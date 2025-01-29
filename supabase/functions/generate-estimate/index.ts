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
    const { projectDescription, imageUrl, answers, contractorId } = await req.json();
    console.log('Generating estimate for:', { projectDescription, imageUrl, answers, contractorId });

    // Fetch options from the database for context
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env;
    const optionsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Options`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch options from database');
    }

    const options = await optionsResponse.json();

    const systemPrompt = `You are an AI assistant that generates detailed cost estimates for construction projects.
    Use the provided knowledge base and customer answers to generate accurate line items grouped by category.
    Make sure to provide detailed descriptions for each line item.
    
    Knowledge Base:
    ${JSON.stringify(options, null, 2)}
    
    Return a JSON object with this exact structure:
    {
      "groups": [
        {
          "name": "string",
          "description": "string",
          "items": [
            {
              "title": "string",
              "description": "string",
              "quantity": number,
              "unit": "string",
              "unitAmount": number,
              "totalPrice": number
            }
          ]
        }
      ],
      "totalCost": number,
      "notes": string[]
    }`;

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('LLAMA_API_KEY is not set');
    }

    // Fetch contractor details
    const contractorResponse = await fetch(`${SUPABASE_URL}/rest/v1/contractors?id=eq.${contractorId}&select=*,contractor_settings(*)`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!contractorResponse.ok) {
      throw new Error('Failed to fetch contractor details');
    }

    const [contractor] = await contractorResponse.json();
    console.log('Contractor details:', contractor);

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate a detailed estimate for this project:
            Description: ${projectDescription}
            Customer Responses: ${JSON.stringify(answers, null, 2)}
            
            Use the knowledge base to inform pricing and line items.
            Consider these contractor settings:
            - Minimum Project Cost: ${contractor?.contractor_settings?.minimum_project_cost || 1000}
            - Markup Percentage: ${contractor?.contractor_settings?.markup_percentage || 20}
            - Tax Rate: ${contractor?.contractor_settings?.tax_rate || 8.5}
            
            Generate at least 3 groups with multiple line items in each group.
            Be specific with quantities and measurements.`
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

    // Validate minimum requirements
    if (!estimateData.groups || estimateData.groups.length < 3) {
      throw new Error('Not enough groups generated');
    }

    // Add contractor information to the response
    const responseData = {
      ...estimateData,
      contractor: {
        businessName: contractor.business_name,
        logoUrl: contractor.business_logo_url,
        contactEmail: contractor.contact_email,
        contactPhone: contractor.contact_phone
      }
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating estimate:', error);
    return new Response(JSON.stringify({
      error: error.message,
      groups: [
        {
          name: "Labor",
          description: "Initial assessment and basic labor costs",
          items: [
            {
              title: "Initial Assessment",
              description: "Professional evaluation of project requirements",
              quantity: 1,
              unit: "hour",
              unitAmount: 150,
              totalPrice: 150
            }
          ]
        }
      ],
      totalCost: 150,
      notes: ["This is a basic estimate. Please contact us for a more detailed assessment."],
      contractor: null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});