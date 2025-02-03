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

    // Format answers for the AI prompt
    const formattedAnswers = Object.entries(answers).map(([category, categoryAnswers]) => {
      return {
        category,
        responses: Object.entries(categoryAnswers).map(([questionId, data]) => ({
          question: data.question,
          answers: data.answers,
          selectedOptions: data.options.map(opt => opt.label)
        }))
      };
    });

    // Fetch contractor details if available
    let contractor = null;
    if (contractorId) {
      const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env;
      const contractorResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/contractors?id=eq.${contractorId}&select=*,contractor_settings(*)`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      if (contractorResponse.ok) {
        [contractor] = await contractorResponse.json();
      }
    }

    const systemPrompt = `You are an AI assistant that generates detailed cost estimates for construction projects.
    Generate accurate line items grouped by category based on the customer's answers.
    Each estimate must include:
    1. A title summarizing the project
    2. An overview description of the work
    3. Multiple groups of related items
    4. Detailed line items with specific quantities and measurements
    
    Return a JSON object with this exact structure:
    {
      "title": "string",
      "description": "string",
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

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate a detailed estimate for this project:
            Description: ${projectDescription}
            Customer Responses: ${JSON.stringify(formattedAnswers, null, 2)}
            
            Consider these settings:
            - Minimum Project Cost: ${contractor?.contractor_settings?.minimum_project_cost || 1000}
            - Markup Percentage: ${contractor?.contractor_settings?.markup_percentage || 20}
            - Tax Rate: ${contractor?.contractor_settings?.tax_rate || 8.5}
            
            Generate at least 3 groups with multiple line items in each group.
            Be specific with quantities and measurements.
            Include a clear title and overview description of the project.`
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

    // Add contractor information to the response
    const responseData = {
      ...estimateData,
      contractor: contractor ? {
        businessName: contractor.business_name,
        logoUrl: contractor.business_logo_url,
        contactEmail: contractor.contact_email,
        contactPhone: contractor.contact_phone
      } : null
    };

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating estimate:', error);
    return new Response(JSON.stringify({
      title: "Basic Project Estimate",
      description: "Initial assessment and basic cost estimate for your project",
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