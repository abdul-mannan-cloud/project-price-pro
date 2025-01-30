import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, imageUrl, previousAnswers, existingQuestions } = await req.json();
    console.log('Processing request with:', { projectDescription, imageUrl, previousAnswers, existingQuestions });

    // First, get template questions from the Options table
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Fetch template questions from Options table
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/Options`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch template questions');
    }

    const optionsData = await optionsResponse.json();
    console.log('Fetched template questions:', optionsData);

    // Extract and process template questions
    const templateQuestions = [];
    if (optionsData.length > 0) {
      const options = optionsData[0];
      ['Question 1', 'Question 2', 'Question 3', 'Question 4'].forEach(key => {
        if (options[key] && typeof options[key] === 'object') {
          const questionData = options[key];
          if (questionData.task && 
              projectDescription.toLowerCase().includes(questionData.task.toLowerCase())) {
            templateQuestions.push({
              question: questionData.question,
              options: questionData.options.map((opt: string, idx: number) => ({
                id: idx.toString(),
                label: opt
              }))
            });
          }
        }
      });
    }

    console.log('Matched template questions:', templateQuestions);

    // Generate additional AI questions if needed
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      console.log('No LLAMA_API_KEY found, skipping AI question generation');
      return new Response(JSON.stringify({ questions: templateQuestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description and any existing template questions, generate additional relevant questions.
    Do not duplicate any existing template questions.
    
    Each question MUST:
    - Be specific and actionable
    - Have exactly 4 relevant options
    - Help contractors better understand project needs
    
    Your response MUST be a valid JSON array of questions with this structure:
    [
      {
        "question": "string",
        "options": [
          { "id": "string", "label": "string" }
        ]
      }
    ]`;

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b',
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate additional questions for this project:
            Description: ${projectDescription}
            Existing Template Questions: ${JSON.stringify(templateQuestions)}
            
            Generate 2-3 additional relevant questions that don't overlap with the template questions.`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!llamaResponse.ok) {
      console.error('Llama API error:', await llamaResponse.text());
      // Return template questions even if AI generation fails
      return new Response(JSON.stringify({ questions: templateQuestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResponse = await llamaResponse.json();
    console.log('AI response:', aiResponse);

    let aiQuestions = [];
    try {
      const content = aiResponse.choices[0].message.content;
      const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      aiQuestions = parsedContent.questions || [];
    } catch (error) {
      console.error('Failed to parse AI response:', error);
    }

    // Combine template and AI-generated questions
    const allQuestions = [...templateQuestions, ...aiQuestions];
    console.log('Final questions:', allQuestions);

    return new Response(JSON.stringify({ questions: allQuestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      questions: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});