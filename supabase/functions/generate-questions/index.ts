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
    let followUpQuestions: any[] = [];
    const processedQuestions = new Set();

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
        const questionData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        const questions = Array.isArray(questionData) ? questionData : [questionData];
        
        console.log(`Parsed questions from ${columnKey}:`, questions);

        questions.forEach((q: any) => {
          if (!q.task || !q.question || processedQuestions.has(q.question)) {
            return;
          }

          const taskWords = q.task.toLowerCase().split(/[\s,\n]+/).filter(word => word.length > 2);
          
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

              // If this question has follow-ups, process them
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

    // Combine main questions and follow-ups
    const finalQuestions = [...allQuestions, ...followUpQuestions];
    console.log(`Total questions matched: ${finalQuestions.length}`);
    console.log('Final questions array:', finalQuestions);

    // Sort questions by stage and limit to a reasonable number
    const limitedQuestions = finalQuestions
      .sort((a, b) => a.stage - b.stage)
      .slice(0, 15);

    return new Response(JSON.stringify({
      questions: limitedQuestions,
      totalStages: limitedQuestions.length
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