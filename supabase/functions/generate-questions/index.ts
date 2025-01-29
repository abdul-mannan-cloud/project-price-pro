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
    console.log('Generating questions for project:', { projectDescription, imageUrl, previousAnswers });

    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description, image (if provided), and previous answers, generate 3-5 focused questions.
    Questions should help understand:
    - Project scope and specific requirements
    - Timeline expectations
    - Budget considerations
    - Property details and constraints
    
    Each question should be customer-focused and help contractors better understand the project needs.
    If previous answers indicate specific areas needing clarification, generate follow-up questions.
    Each question MUST have exactly 4 relevant options.
    
    Return ONLY a JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "string (customer-focused question)",
          "options": [
            { "id": "string", "label": "string" }
          ],
          "type": "scope" | "timeline" | "budget" | "property",
          "followUpTriggers": {
            "optionId": "string (what answer triggers follow-up)",
            "followUpQuestion": {
              "question": "string",
              "options": [
                { "id": "string", "label": "string" }
              ]
            }
          }
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
            text: `Generate customer-focused questions for this project:
            Description: ${projectDescription}
            Previous Answers: ${JSON.stringify(previousAnswers || {}, null, 2)}
            
            Remember:
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