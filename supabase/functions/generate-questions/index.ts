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

    // Fetch specific row from Options table using the UUID
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
    console.log('Raw Options data:', optionsData);

    if (!optionsData || !optionsData.length) {
      throw new Error('No Options data found');
    }

    const firstRow = optionsData[0];
    let allQuestions: any[] = [];
    let followUpQuestions: any[] = [];
    const processedQuestions = new Set();

    // Define relevant categories and keywords for kitchen remodel
    const relevantKeywords = [
      'kitchen', 'remodel', 'cabinet', 'countertop', 'backsplash', 'sink',
      'appliance', 'lighting', 'paint', 'floor', 'tile', 'demo', 'drywall'
    ];

    // Process each JSONB column (Question 1 through 4)
    for (let i = 1; i <= 4; i++) {
      const columnKey = `Question ${i}`;
      const jsonData = firstRow[columnKey];
      
      console.log(`Processing ${columnKey}:`, JSON.stringify(jsonData, null, 2));

      if (!jsonData) continue;

      try {
        const questionData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        console.log(`Parsed question data for ${columnKey}:`, JSON.stringify(questionData, null, 2));
        
        // Handle both array and single object formats
        const questions = Array.isArray(questionData) ? questionData : [questionData];
        
        questions.forEach((q: any) => {
          console.log(`Processing question:`, JSON.stringify(q, null, 2));
          
          if (!q.task || !q.question || processedQuestions.has(q.question)) {
            console.log('Skipping question due to missing data or duplicate');
            return;
          }

          const taskWords = q.task.toLowerCase().split(/[\s,\n]+/);
          
          // Check if task matches any relevant keywords
          const isRelevant = relevantKeywords.some(keyword => 
            taskWords.some(word => word.includes(keyword) || keyword.includes(word))
          );

          if (isRelevant) {
            console.log(`✅ Matched question for task "${q.task}":`, q.question);
            processedQuestions.add(q.question);
            
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
              const questionObj = {
                stage: allQuestions.length + followUpQuestions.length + 1,
                question: q.question,
                options,
                isMultiChoice: q.multi_choice || false
              };

              if (q.follow_up_questions && Array.isArray(q.follow_up_questions)) {
                questionObj.isFinal = false;
                allQuestions.push(questionObj);

                q.follow_up_questions.forEach((followUp: any, index: number) => {
                  if (followUp.question && (Array.isArray(followUp.options) || Array.isArray(followUp.selections))) {
                    const followUpOptions = Array.isArray(followUp.options) 
                      ? followUp.options.map((opt: any, idx: number) => ({
                          id: `${columnKey}-followup-${index}-${idx}`,
                          label: typeof opt === 'string' ? opt : opt.label || String(opt)
                        }))
                      : followUp.selections.map((label: string, idx: number) => ({
                          id: `${columnKey}-followup-${index}-${idx}`,
                          label: String(label)
                        }));

                    if (followUpOptions.length > 0) {
                      followUpQuestions.push({
                        stage: allQuestions.length + followUpQuestions.length + 1,
                        question: followUp.question,
                        options: followUpOptions,
                        isMultiChoice: followUp.multi_choice || false,
                        isFollowUp: true,
                        parentQuestionId: questionObj.stage
                      });
                    }
                  }
                });
              } else {
                questionObj.isFinal = true;
                allQuestions.push(questionObj);
              }
            }
          }
        });
      } catch (error) {
        console.error(`Error processing ${columnKey}:`, error);
      }
    }

    // Combine and sort questions
    const finalQuestions = [...allQuestions, ...followUpQuestions]
      .sort((a, b) => a.stage - b.stage);

    console.log(`Total questions matched: ${finalQuestions.length}`);
    console.log('Final questions array:', JSON.stringify(finalQuestions, null, 2));

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