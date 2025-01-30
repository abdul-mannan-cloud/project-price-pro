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
    const { projectDescription } = await req.json();
    console.log('Processing request with description:', projectDescription);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Fetch first row from Options table
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/Options?limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch Options data');
    }

    const optionsData = await optionsResponse.json();
    console.log('Raw Options data:', optionsData);

    if (!optionsData || !optionsData.length) {
      throw new Error('No Options data found');
    }

    const firstRow = optionsData[0];
    let allQuestions: any[] = [];
    const processedQuestions = new Set(); // To avoid duplicates

    // Process each JSONB column (Question 1 through 4)
    for (let i = 1; i <= 4; i++) {
      const columnKey = `Question ${i}`;
      const jsonData = firstRow[columnKey];
      
      console.log(`Processing ${columnKey}:`, jsonData);

      if (!jsonData) {
        console.log(`No data in ${columnKey}`);
        continue;
      }

      let questionData;
      try {
        // Handle both string and parsed JSON
        questionData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        // Ensure we're working with the data array
        const questions = questionData.data || [questionData];
        
        console.log(`Parsed questions from ${columnKey}:`, questions);

        // Process each question in the column
        questions.forEach((q: any) => {
          if (!q.task || !q.question || processedQuestions.has(q.question)) {
            return;
          }

          // Convert input and task to lowercase for case-insensitive matching
          const lowercaseInput = projectDescription.toLowerCase();
          const lowercaseTask = q.task.toLowerCase();

          // Check if any word from the task matches in the input
          const taskWords = lowercaseTask.split(/\s+/);
          const matches = taskWords.some(word => 
            lowercaseInput.includes(word) && word.length > 2 // Ignore very short words
          );

          if (matches) {
            console.log(`✅ Matched question for task "${q.task}":`, q.question);
            processedQuestions.add(q.question);
            
            allQuestions.push({
              stage: allQuestions.length + 1,
              question: q.question,
              options: Array.isArray(q.selections) 
                ? q.selections.map((label: string, idx: number) => ({
                    id: `${columnKey}-${idx}`,
                    label: String(label)
                  }))
                : [],
              isMultiChoice: q.multi_choice || false
            });
          }
        });
      } catch (error) {
        console.error(`Error processing ${columnKey}:`, error);
      }
    }

    console.log(`Total questions matched: ${allQuestions.length}`);
    console.log('Final questions array:', allQuestions);

    return new Response(JSON.stringify({
      questions: allQuestions,
      totalStages: allQuestions.length
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