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
    console.log('Received request:', { projectDescription, imageUrl });

    const messages = [
      {
        role: "system",
        content: `You are an AI assistant that generates relevant questions for construction project estimates. 
        Generate 5 high-impact questions in multiple-choice format.
        Always include a "Who should supply materials?" question if relevant.
        Each question should have 4 options.
        Return ONLY a JSON object with a 'questions' array containing question objects with 'question' and 'options' properties.
        Example format:
        {
          "questions": [
            {
              "question": "What is the scope of work?",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"]
            }
          ]
        }`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate questions for this project: ${projectDescription}`
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
        'Authorization': `Bearer ${Deno.env.get('LLAMA_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    const data = await response.json();
    console.log('AI Response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid AI response format');
    }

    const parsedContent = JSON.parse(data.choices[0].message.content);
    
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      throw new Error('Invalid questions format in AI response');
    }

    // Format the questions to match the frontend expectations
    const formattedQuestions = {
      questions: parsedContent.questions.map(q => ({
        question: q.question,
        options: q.options.map((opt: string, index: number) => ({
          id: index.toString(),
          label: opt
        }))
      }))
    };

    console.log('Formatted response:', formattedQuestions);

    return new Response(JSON.stringify(formattedQuestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});