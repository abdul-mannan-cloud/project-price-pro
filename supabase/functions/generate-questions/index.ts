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

    // Default questions to use as fallback
    const defaultQuestions = {
      questions: [
        {
          question: "What type of project are you looking to estimate?",
          options: [
            { id: "0", label: "Home Renovation" },
            { id: "1", label: "Repair Work" },
            { id: "2", label: "New Installation" },
            { id: "3", label: "Maintenance" }
          ]
        },
        {
          question: "What is your preferred timeline?",
          options: [
            { id: "0", label: "As soon as possible" },
            { id: "1", label: "Within 1 month" },
            { id: "2", label: "Within 3 months" },
            { id: "3", label: "Flexible" }
          ]
        },
        {
          question: "What is your budget range?",
          options: [
            { id: "0", label: "Under $5,000" },
            { id: "1", label: "$5,000 - $15,000" },
            { id: "2", label: "$15,000 - $30,000" },
            { id: "3", label: "Over $30,000" }
          ]
        }
      ]
    };

    const systemPrompt = `You are an AI assistant that generates relevant questions for construction project estimates. 
    Generate exactly 3 questions in multiple-choice format.
    Each question MUST have exactly 4 options.
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
      `Based on this project description: ${projectDescription}\nAnd this image: ${imageUrl}\nGenerate 3 relevant multiple-choice questions to help estimate the project cost.` :
      `Based on this project description: ${projectDescription}\nGenerate 3 relevant multiple-choice questions to help estimate the project cost.`;

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
          temperature: 0.5,
          max_tokens: 1000,
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

      // Validate response structure
      if (!parsedResponse.questions || !Array.isArray(parsedResponse.questions)) {
        console.error('Invalid response structure:', parsedResponse);
        return new Response(JSON.stringify(defaultQuestions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Format and validate each question
      const formattedQuestions = parsedResponse.questions.slice(0, 3).map((q: any) => ({
        question: String(q.question || ""),
        options: Array.isArray(q.options) 
          ? q.options.slice(0, 4).map((opt: any, i: number) => ({
              id: String(i),
              label: String(typeof opt === 'object' ? opt.label : opt)
            }))
          : defaultQuestions.questions[0].options
      }));

      // Ensure we have exactly 3 questions
      while (formattedQuestions.length < 3) {
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