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
        content: imageUrl ? [
          { type: "text", text: projectDescription },
          { type: "image_url", image_url: imageUrl }
        ] : projectDescription
      }
    ];

    console.log('Sending request to Llama:', messages);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LLAMA_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages,
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Llama API error:', errorText);
      throw new Error(`Llama API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Llama Response:', data);

    if (!data.choices?.[0]?.message?.content) {
      console.error('Invalid AI response format - no content:', data);
      throw new Error('Invalid AI response format - no content in response');
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse(data.choices[0].message.content);
      console.log('Parsed content:', parsedContent);
    } catch (error) {
      console.error('Failed to parse AI response:', data.choices[0].message.content);
      throw new Error('Invalid JSON in AI response');
    }
    
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      console.error('Invalid questions format:', parsedContent);
      throw new Error('Invalid questions format in AI response');
    }

    // Validate each question has the required format
    parsedContent.questions.forEach((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4) {
        console.error(`Invalid question format at index ${index}:`, q);
        throw new Error(`Question ${index + 1} has invalid format`);
      }
    });

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