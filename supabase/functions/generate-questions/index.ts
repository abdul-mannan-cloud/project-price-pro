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

    // Try to parse the raw response first
    let data;
    try {
      data = JSON.parse(rawData);
      console.log('Parsed Llama response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to parse raw Llama response:', error);
      // If the raw response isn't valid JSON, try to extract JSON from it
      const jsonMatch = rawData.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
          console.log('Extracted and parsed JSON from response:', JSON.stringify(data, null, 2));
        } catch (innerError) {
          console.error('Failed to parse extracted JSON:', innerError);
          throw new Error('Invalid JSON format in Llama response');
        }
      } else {
        console.error('No JSON found in response:', rawData);
        throw new Error('No valid JSON found in Llama response');
      }
    }

    // Extract the content from the Llama response
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in Llama response:', data);
      throw new Error('No content found in Llama response');
    }

    // Parse the content if it's a string, or use it directly if it's already an object
    let parsedContent;
    try {
      parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      console.log('Parsed content:', JSON.stringify(parsedContent, null, 2));
    } catch (error) {
      console.error('Failed to parse content:', error);
      console.error('Content that failed to parse:', content);
      throw new Error('Invalid content format in Llama response');
    }

    // Validate the questions format
    if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
      console.error('Invalid questions format:', parsedContent);
      throw new Error('Invalid questions format in response');
    }

    // Ensure each question has the required format
    parsedContent.questions.forEach((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options)) {
        console.error(`Invalid question format at index ${index}:`, q);
        throw new Error(`Question ${index + 1} has invalid format`);
      }
      // Ensure exactly 4 options
      if (q.options.length !== 4) {
        q.options = q.options.slice(0, 4);
        while (q.options.length < 4) {
          q.options.push(`Option ${q.options.length + 1}`);
        }
      }
    });

    // Format the response
    const formattedQuestions = {
      questions: parsedContent.questions.map((q: any) => ({
        question: q.question,
        options: q.options.map((opt: string, index: number) => ({
          id: index.toString(),
          label: opt
        }))
      }))
    };

    console.log('Final formatted response:', JSON.stringify(formattedQuestions, null, 2));

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