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

    console.log('Sending request to Llama:', JSON.stringify(messages, null, 2));

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
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Llama API error response:', errorText);
      throw new Error(`Llama API error: ${llamaResponse.status} - ${errorText}`);
    }

    const rawData = await llamaResponse.text();
    console.log('Raw Llama response:', rawData);

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(rawData);
      console.log('Successfully parsed raw response:', JSON.stringify(parsedResponse, null, 2));
    } catch (error) {
      console.error('Failed to parse raw response:', error);
      throw new Error('Failed to parse Llama API response');
    }

    const content = parsedResponse.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in response:', parsedResponse);
      throw new Error('No content in Llama API response');
    }

    let questionsData;
    try {
      // If content is already an object, use it; if it's a string, parse it
      questionsData = typeof content === 'string' ? JSON.parse(content) : content;
      console.log('Parsed questions data:', JSON.stringify(questionsData, null, 2));
    } catch (error) {
      console.error('Failed to parse content:', error);
      throw new Error('Invalid questions format in response');
    }

    // Ensure we have a questions array
    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      console.error('Missing questions array:', questionsData);
      
      // Try to create a valid format from the response
      if (Array.isArray(questionsData)) {
        questionsData = { questions: questionsData };
      } else {
        throw new Error('Invalid response format: missing questions array');
      }
    }

    // Process and validate each question
    const validatedQuestions = questionsData.questions.map((q: any, index: number) => {
      if (!q.question || typeof q.question !== 'string') {
        throw new Error(`Invalid question at index ${index}: missing or invalid question text`);
      }

      let options = Array.isArray(q.options) ? q.options : [];
      
      // Ensure we have exactly 4 options
      options = options.slice(0, 4);
      while (options.length < 4) {
        options.push(`Option ${options.length + 1}`);
      }

      // Ensure all options are strings
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
      questions: validatedQuestions.slice(0, 5) // Ensure we have at most 5 questions
    };

    console.log('Final formatted response:', JSON.stringify(formattedResponse, null, 2));

    return new Response(JSON.stringify(formattedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});