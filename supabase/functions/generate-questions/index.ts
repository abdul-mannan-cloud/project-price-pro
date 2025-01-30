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

    // Extract keywords from the project description
    const keywords = projectDescription.toLowerCase().split(/[\s,\n]+/).filter(word => word.length > 2);
    const commonKeywords = ['kitchen', 'remodel', 'demo', 'drywall', 'tile', 'cabinets', 'countertops', 
                          'backsplash', 'sink', 'lights', 'appliances', 'painting', 'floor'];
    
    console.log('Extracted keywords:', keywords);

    // Process each JSONB column (Question 1 through 4)
    for (let i = 1; i <= 4; i++) {
      const columnKey = `Question ${i}`;
      const jsonData = firstRow[columnKey];
      
      console.log(`Processing ${columnKey}:`, jsonData);

      if (!jsonData) {
        console.log(`No data in ${columnKey}`);
        continue;
      }

      try {
        // Parse JSON data
        const questionData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        const questions = Array.isArray(questionData) ? questionData : [questionData];
        
        console.log(`Parsed questions from ${columnKey}:`, questions);

        // Process each question in the column
        questions.forEach((q: any) => {
          if (!q.task || !q.question || processedQuestions.has(q.question)) {
            return;
          }

          // Convert task to lowercase and split into words
          const taskWords = q.task.toLowerCase().split(/[\s,\n]+/).filter(word => word.length > 2);
          
          // Check for keyword matches
          const matches = keywords.some(keyword => 
            taskWords.some(taskWord => 
              taskWord.includes(keyword) || 
              keyword.includes(taskWord) ||
              commonKeywords.includes(taskWord)
            )
          );

          if (matches) {
            console.log(`✅ Matched question for task "${q.task}":`, q.question);
            processedQuestions.add(q.question);
            
            // Prepare options array
            let options = [];
            if (Array.isArray(q.options)) {
              options = q.options.map((opt: any, idx: number) => ({
                id: `${columnKey}-${idx}`,
                label: typeof opt === 'string' ? opt : opt.label || String(opt)
              }));
            } else if (Array.isArray(q.selections)) {
              options = q.selections.map((label: string, idx: number) => ({
                id: `${columnKey}-${idx}`,
                label: String(label)
              }));
            }

            if (options.length > 0) {
              allQuestions.push({
                stage: allQuestions.length + 1,
                question: q.question,
                options,
                isMultiChoice: q.multi_choice || false
              });
            }
          }
        });
      } catch (error) {
        console.error(`Error processing ${columnKey}:`, error);
      }
    }

    console.log(`Total questions matched: ${allQuestions.length}`);
    console.log('Final questions array:', allQuestions);

    // Sort questions by relevance and limit to a reasonable number
    allQuestions = allQuestions.slice(0, 15); // Limit to 15 questions max

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