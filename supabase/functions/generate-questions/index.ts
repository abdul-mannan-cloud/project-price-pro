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
    const { projectDescription, imageUrl } = await req.json();
    console.log('Processing request with description:', projectDescription);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

    if (!supabaseUrl || !supabaseKey || !llamaApiKey) {
      throw new Error('Missing required configuration');
    }

    // Fetch questions from Options table with specific UUID
    const optionsResponse = await fetch(
      `${supabaseUrl}/rest/v1/Options?Key%20Options=eq.42e64c9c-53b2-49bd-ad77-995ecb3106c6`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      }
    );

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch Options data');
    }

    const optionsData = await optionsResponse.json();
    console.log('Options data fetched:', optionsData);

    if (!optionsData || !optionsData.length) {
      throw new Error('No Options data found');
    }

    // Process questions from the Options table
    const firstRow = optionsData[0];
    const allQuestions = [];
    const processedQuestions = new Set();

    // Process each JSONB column (Question 1 through 4)
    for (let i = 1; i <= 4; i++) {
      const columnKey = `Question ${i}`;
      const jsonData = firstRow[columnKey];
      
      if (!jsonData) continue;

      try {
        const questionData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        const questions = Array.isArray(questionData) ? questionData : [questionData];
        
        questions.forEach((q) => {
          if (!q.task || !q.question || processedQuestions.has(q.question)) {
            return;
          }

          processedQuestions.add(q.question);
          
          const options = Array.isArray(q.options) 
            ? q.options.map((opt, idx) => ({
                id: `${columnKey}-${idx}`,
                label: typeof opt === 'string' ? opt : opt.label || String(opt)
              }))
            : Array.isArray(q.selections)
              ? q.selections.map((label, idx) => ({
                  id: `${columnKey}-${idx}`,
                  label: String(label)
                }))
              : [];

          if (options.length > 0) {
            allQuestions.push({
              stage: allQuestions.length + 1,
              question: q.question,
              options,
              isMultiChoice: q.multi_choice || false,
              isFinal: true
            });
          }
        });
      } catch (error) {
        console.error(`Error processing ${columnKey}:`, error);
      }
    }

    // Limit to 30 questions
    const finalQuestions = allQuestions.slice(0, 30);
    console.log(`Generated ${finalQuestions.length} questions`);

    return new Response(JSON.stringify({
      questions: finalQuestions,
      totalStages: finalQuestions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      questions: [],
      totalStages: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});