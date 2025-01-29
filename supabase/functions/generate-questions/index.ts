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
    const { projectDescription, imageUrl, previousAnswers } = await req.json();
    console.log('Generating questions for:', { projectDescription, imageUrl, previousAnswers });

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

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('LLAMA_API_KEY is not set');
    }

    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description, image (if provided), previous answers, and the provided knowledge base of questions and tasks, generate exactly 7 focused questions.
    
    Use the following knowledge base to inform your questions:
    ${JSON.stringify(options, null, 2)}
    
    Questions should help understand:
    1. Project scope and specific requirements
    2. Timeline expectations
    3. Budget considerations
    4. Property details and constraints
    5. Material preferences
    6. Design preferences
    7. Special requirements or constraints
    
    Each question MUST:
    - Be customer-focused and help contractors better understand the project needs
    - Have exactly 4 relevant options
    - Be specific and actionable
    - Build upon previous answers if available
    
    Return ONLY a JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "string (customer-focused question)",
          "options": [
            { "id": "string", "label": "string" }
          ]
        }
      ]
    }`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate customer-focused questions for this project:
            Description: ${projectDescription || "New project inquiry"}
            Previous Answers: ${JSON.stringify(previousAnswers || {}, null, 2)}
            
            Remember:
            - Generate exactly 7 questions
            - Questions should help contractors understand customer needs
            - Follow-up questions should be based on previous answers
            - All questions should be from customer perspective`
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

    // Validate that we have exactly 7 questions
    if (!questionsData.questions || questionsData.questions.length !== 7) {
      throw new Error('Invalid number of questions generated');
    }

    // Validate each question has exactly 4 options
    questionsData.questions.forEach((q: any, index: number) => {
      if (!q.options || q.options.length !== 4) {
        throw new Error(`Question ${index + 1} does not have exactly 4 options`);
      }
    });

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
          ]
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});