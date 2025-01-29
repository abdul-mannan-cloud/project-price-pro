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
    const { projectDescription, imageUrl } = await req.json();
    console.log('Generating questions for:', { projectDescription, imageUrl });

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
    console.log('Retrieved options from database:', options);

    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description, image (if provided), and the provided knowledge base of questions and tasks, generate at least 7 focused questions.
    
    Use this knowledge base to inform your questions:
    ${JSON.stringify(options, null, 2)}
    
    Important rules:
    1. Generate AT LEAST 7 questions
    2. Use the Q1, Q2, Q3 categories from the knowledge base when relevant
    3. Include questions about:
       - Project scope and specific requirements
       - Timeline expectations
       - Budget considerations
       - Property details
       - Material preferences
       - Specific measurements or dimensions
       - Any potential challenges or constraints
    4. Each question MUST have exactly 4 relevant options
    5. Make questions customer-focused and easy to understand
    
    Return a JSON object with this structure:
    {
      "questions": [
        {
          "question": "string",
          "options": [
            { "id": "string", "label": "string" }
          ],
          "type": "scope" | "timeline" | "budget" | "property" | "materials" | "measurements" | "constraints",
          "category": "string (matching Q1 Category from knowledge base if applicable)"
        }
      ]
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
            text: `Generate detailed questions for this project:
            Description: ${projectDescription}
            
            Remember:
            - Use the knowledge base to inform question generation
            - Generate at least 7 questions
            - Make questions customer-focused
            - Include all required question types`
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

    const questionsData = JSON.parse(data.choices[0].message.content);
    console.log('Parsed questions:', questionsData);

    // Validate minimum requirements
    if (!questionsData.questions || questionsData.questions.length < 7) {
      throw new Error('Not enough questions generated. Minimum 7 required.');
    }

    return new Response(JSON.stringify(questionsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      questions: [
        {
          question: "What type of project are you looking to get an estimate for?",
          options: [
            { id: "renovation", label: "Home Renovation" },
            { id: "repair", label: "Repair Work" },
            { id: "installation", label: "New Installation" },
            { id: "maintenance", label: "General Maintenance" }
          ],
          type: "scope"
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});