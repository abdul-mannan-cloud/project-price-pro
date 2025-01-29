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

    // Default questions as fallback
    const defaultQuestions = {
      questions: Array(8).fill(null).map((_, index) => ({
        question: `Default Question ${index + 1}`,
        options: [
          { id: "0", label: "Option A" },
          { id: "1", label: "Option B" },
          { id: "2", label: "Option C" },
          { id: "3", label: "Option D" }
        ]
      }))
    };

    const systemPrompt = `You are an AI assistant that generates relevant questions for construction project estimates. 
    Based on the project description, generate between 5 and 8 questions in multiple-choice format.
    Each question MUST have exactly 4 options.
    Questions should cover: project scope, timeline, materials, specific requirements, and budget range.
    Return ONLY a JSON object with this exact structure, no other text:
    {
      "questions": [
        {
          "question": "string",
          "options": [
            { "id": "0", "label": "string" },
            { "id": "1", "label": "string" },
            { "id": "2", "label": "string" },
            { "id": "3", "label": "string" }
          ]
        }
      ]
    }`;

    const userContent = imageUrl ? 
      `Based on this project description: ${projectDescription}\nAnd this image: ${imageUrl}\nGenerate between 5 and 8 relevant multiple-choice questions to help estimate the project cost.` :
      `Based on this project description: ${projectDescription}\nGenerate between 5 and 8 relevant multiple-choice questions to help estimate the project cost.`;

    console.log('Sending request to Llama API with prompt:', { systemPrompt, userContent });

    try {
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
          max_tokens: 2000,
          response_format: { type: "json_object" }
        }),
      });

      if (!llamaResponse.ok) {
        console.error('Llama API error:', await llamaResponse.text());
        console.log('Falling back to default questions due to API error');
        return new Response(JSON.stringify(defaultQuestions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rawResponse = await llamaResponse.text();
      console.log('Raw Llama response:', rawResponse);

      // Try to extract just the JSON part
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No valid JSON found in response');
        return new Response(JSON.stringify(defaultQuestions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cleanedResponse = jsonMatch[0];
      console.log('Cleaned response:', cleanedResponse);

      const parsedResponse = JSON.parse(cleanedResponse);
      console.log('Parsed response:', parsedResponse);

      // Validate response structure and ensure between 5-8 questions
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        console.error('Invalid response structure:', parsedResponse);
        return new Response(JSON.stringify(defaultQuestions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Format and validate each question, ensuring between 5-8 questions
      let formattedQuestions = parsedResponse.questions
        .slice(0, 8) // Limit to maximum 8 questions
        .map((q: any) => ({
          question: String(q.question || ""),
          options: Array.isArray(q.options) 
            ? q.options.slice(0, 4).map((opt: any, i: number) => ({
                id: String(i),
                label: String(typeof opt === 'object' ? opt.label : opt)
              }))
            : defaultQuestions.questions[0].options
        }));

      // Ensure minimum 5 questions
      while (formattedQuestions.length < 5) {
        formattedQuestions.push(defaultQuestions.questions[formattedQuestions.length]);
      }

      const finalResponse = { questions: formattedQuestions };
      console.log('Final formatted response:', finalResponse);

      return new Response(JSON.stringify(finalResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      console.error('Error processing Llama response:', error);
      return new Response(JSON.stringify(defaultQuestions), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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