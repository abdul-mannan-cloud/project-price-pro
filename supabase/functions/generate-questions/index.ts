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

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

    if (!supabaseUrl || !supabaseKey || !llamaApiKey) {
      throw new Error('Missing required environment variables');
    }

    // Fetch options from the database for context
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/Options`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch options from database');
    }

    const options = await optionsResponse.json();
    console.log('Retrieved options from database:', options);

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
    
    Your response MUST be a valid JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "string",
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
            - Each question must have exactly 4 options
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

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Llama API error response:', errorText);
      throw new Error(`Llama API error: ${llamaResponse.status} ${llamaResponse.statusText}`);
    }

    const data = await llamaResponse.json();
    console.log('Llama raw response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid Llama response structure:', data);
      throw new Error('Invalid response format from Llama');
    }

    let questionsData;
    try {
      questionsData = JSON.parse(data.choices[0].message.content);
      console.log('Parsed questions data:', questionsData);
    } catch (error) {
      console.error('Failed to parse Llama response as JSON:', error);
      throw new Error('Invalid JSON response from Llama');
    }

    // Validate response structure
    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      console.error('Invalid questions structure:', questionsData);
      throw new Error('Invalid questions format from Llama');
    }

    // Validate number of questions
    if (questionsData.questions.length !== 7) {
      console.error('Wrong number of questions:', questionsData.questions.length);
      throw new Error(`Expected 7 questions, got ${questionsData.questions.length}`);
    }

    // Validate each question has exactly 4 options
    questionsData.questions.forEach((q, index) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        console.error(`Invalid options for question ${index + 1}:`, q);
        throw new Error(`Question ${index + 1} does not have exactly 4 options`);
      }
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Question ${index + 1} is missing or has invalid question text`);
      }
      q.options.forEach((opt, optIndex) => {
        if (!opt.id || !opt.label || typeof opt.id !== 'string' || typeof opt.label !== 'string') {
          throw new Error(`Invalid option format for question ${index + 1}, option ${optIndex + 1}`);
        }
      });
    });

    return new Response(JSON.stringify(questionsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Return a fallback question if there's an error
    return new Response(JSON.stringify({ 
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