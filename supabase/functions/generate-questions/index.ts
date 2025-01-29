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

    const systemPrompt = `You are an AI assistant that generates relevant questions for construction project estimates. 
    Generate 3-5 high-impact questions in multiple-choice format.
    Each question should have exactly 4 options.
    Return a JSON object in this exact format:
    {
      "questions": [
        {
          "question": "string",
          "options": ["string", "string", "string", "string"]
        }
      ]
    }`;

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: imageUrl ? [
          { type: "text", text: projectDescription },
          { type: "image_url", image_url: imageUrl }
        ] : projectDescription
      }
    ];

    console.log('Sending request to Llama API...');

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LLAMA_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      }),
    });

    if (!llamaResponse.ok) {
      console.error('Llama API error:', await llamaResponse.text());
      throw new Error(`Llama API error: ${llamaResponse.status}`);
    }

    const rawResponse = await llamaResponse.text();
    console.log('Raw Llama response:', rawResponse);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawResponse);
      console.log('Parsed response:', parsedResponse);
    } catch (error) {
      console.error('Failed to parse Llama response:', error);
      throw new Error('Invalid JSON in Llama response');
    }

    const content = parsedResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in response:', parsedResponse);
      throw new Error('No content in Llama response');
    }

    let questionsData;
    try {
      questionsData = typeof content === 'string' ? JSON.parse(content) : content;
      console.log('Parsed questions data:', questionsData);
    } catch (error) {
      console.error('Failed to parse content:', error);
      throw new Error('Invalid JSON in questions data');
    }

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      console.error('Invalid questions format:', questionsData);
      throw new Error('Invalid questions format in response');
    }

    // Validate and format each question
    const validatedQuestions = questionsData.questions.map((q: any, index: number) => {
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Invalid question at index ${index}`);
      }

      if (!Array.isArray(q.options) || q.options.length === 0) {
        throw new Error(`Invalid options for question at index ${index}`);
      }

      // Ensure exactly 4 options
      let options = q.options.slice(0, 4);
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }

      // Convert all options to strings
      options = options.map((opt: any) => String(opt));

      return {
        question: q.question,
        options: options.map((opt: string, i: number) => ({
          id: i.toString(),
          label: opt
        }))
      };
    });

    const formattedResponse = {
      questions: validatedQuestions.slice(0, 5) // Limit to 5 questions
    };

    console.log('Final formatted response:', formattedResponse);

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});