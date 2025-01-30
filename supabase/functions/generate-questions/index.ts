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
    const { projectDescription, imageUrl, previousAnswers, existingQuestions } = await req.json();
    console.log('Generating questions for:', { projectDescription, imageUrl, previousAnswers, existingQuestions });

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY environment variable');
    }

    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description and image (if provided), generate additional questions that don't overlap with the existing ones.
    
    Existing questions: ${JSON.stringify(existingQuestions)}
    
    Generate questions about aspects not covered by the existing questions, such as:
    1. Timeline expectations
    2. Budget considerations
    3. Property details and constraints
    4. Special requirements or constraints
    
    Each question MUST:
    - Not overlap with existing questions
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
            text: `Generate additional questions for this project:
            Description: ${projectDescription || "New project inquiry"}
            Previous Answers: ${JSON.stringify(previousAnswers || {}, null, 2)}
            
            Remember:
            - Do not duplicate existing questions
            - Each question must have exactly 4 options
            - Questions should help contractors understand customer needs
            - All questions should be from customer perspective`
          },
          imageUrl ? {
            type: "image_url",
            image_url: imageUrl
          } : null
        ].filter(Boolean)
      }
    ];

    console.log('Sending request to Llama with messages:', JSON.stringify(messages, null, 2));

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
    console.log('Llama raw response:', JSON.stringify(data, null, 2));

    let questionsData;
    try {
      const content = data.choices[0].message.content;
      questionsData = typeof content === 'string' ? JSON.parse(content.trim()) : content;
      
      if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
        console.error('Invalid questions structure:', questionsData);
        return new Response(JSON.stringify({ questions: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(questionsData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Failed to parse or validate Llama response:', error);
      return new Response(JSON.stringify({ questions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify({ questions: [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});