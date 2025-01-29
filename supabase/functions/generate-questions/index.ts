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

    const systemPrompt = `You are an AI assistant that generates relevant questions for contractor project estimates. 
    Based on the project description and any previous answers, generate 3 focused questions in multiple-choice format.
    Each question should help contractors better understand the project scope and requirements.
    Each question MUST have exactly 4 options.
    Questions should cover: project specifics, timeline expectations, and budget considerations.
    Consider previous answers (if any) to generate more specific follow-up questions.
    Return ONLY a JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "string",
          "options": [
            { "id": "string", "label": "string" }
          ],
          "type": "scope" | "timeline" | "budget"
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
            text: `Generate questions for this project:
            Description: ${projectDescription}
            Previous Answers: ${JSON.stringify(previousAnswers || {}, null, 2)}`
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
          question: "What type of project are you looking to estimate?",
          options: [
            { id: "renovation", label: "Home Renovation" },
            { id: "repair", label: "Repair Work" },
            { id: "installation", label: "New Installation" },
            { id: "maintenance", label: "Maintenance" }
          ],
          type: "scope"
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});