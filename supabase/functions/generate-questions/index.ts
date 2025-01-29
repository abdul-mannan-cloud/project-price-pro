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
    Generate 3 questions in multiple-choice format.
    Each question MUST have exactly 4 options.
    The response MUST be a valid JSON object with this exact structure:
    {
      "questions": [
        {
          "question": "What is the scope of your project?",
          "options": ["Small repair", "Medium renovation", "Large remodel", "Complete overhaul"]
        }
      ]
    }`;

    const userContent = imageUrl ? 
      `Project description: ${projectDescription}\nImage URL: ${imageUrl}` :
      projectDescription;

    console.log('Sending request to Llama API with prompt:', systemPrompt);

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LLAMA_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 1000,
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

    // Default questions in case of incomplete response
    const defaultQuestions = [
      {
        question: "What type of project are you looking to estimate?",
        options: ["Home Renovation", "Repair Work", "New Installation", "Maintenance"]
      },
      {
        question: "What is your preferred timeline?",
        options: ["As soon as possible", "Within 1 month", "Within 3 months", "Flexible"]
      },
      {
        question: "What is your budget range?",
        options: ["Under $5,000", "$5,000 - $15,000", "$15,000 - $30,000", "Over $30,000"]
      }
    ];

    // Validate and format each question, falling back to defaults if needed
    const validatedQuestions = questionsData.questions.map((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options)) {
        return defaultQuestions[index] || defaultQuestions[0];
      }

      // Ensure exactly 4 options
      let options = [...q.options];
      while (options.length < 4) {
        options.push(defaultQuestions[0].options[options.length]);
      }
      options = options.slice(0, 4);

      return {
        question: q.question,
        options: options.map((opt: any, i: number) => ({
          id: i.toString(),
          label: String(opt)
        }))
      };
    });

    // Ensure we have at least 3 questions
    while (validatedQuestions.length < 3) {
      validatedQuestions.push(defaultQuestions[validatedQuestions.length]);
    }

    const formattedResponse = {
      questions: validatedQuestions.slice(0, 3)
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