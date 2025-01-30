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
    console.log('Processing request with description:', projectDescription);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

    if (!supabaseUrl || !supabaseKey || !llamaApiKey) {
      throw new Error('Missing required configuration');
    }

    // Enhanced project analysis with Llama
    const analysisResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b',
        messages: [
          {
            role: 'system',
            content: `Analyze the construction project description and extract:
            1. Main project categories (e.g., kitchen, bathroom, flooring)
            2. Specific tasks involved (e.g., demolition, installation)
            3. Materials mentioned (e.g., tile, wood)
            4. Measurements and dimensions
            5. Special requirements or preferences
            
            Return a JSON object with these fields:
            {
              "categories": string[],
              "tasks": string[],
              "materials": string[],
              "dimensions": string[],
              "requirements": string[],
              "keywords": string[]
            }`
          },
          {
            role: 'user',
            content: projectDescription
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error('Failed to analyze project description');
    }

    const analysis = await analysisResponse.json();
    console.log('Enhanced project analysis:', analysis);

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

    const firstRow = optionsData[0];
    let allQuestions = [];
    let followUpQuestions = [];
    const processedQuestions = new Set();

    // Extract analysis data
    const analysisContent = analysis.choices[0].message.content;
    const {
      categories = [],
      tasks = [],
      materials = [],
      dimensions = [],
      requirements = [],
      keywords = []
    } = typeof analysisContent === 'string' ? JSON.parse(analysisContent) : analysisContent;

    // Combine all relevant terms for matching
    const relevantTerms = [...categories, ...tasks, ...materials, ...dimensions, ...requirements, ...keywords];
    console.log('Relevant terms for matching:', relevantTerms);

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

          // Enhanced relevance checking
          const isRelevant = relevantTerms.some(term => 
            q.task.toLowerCase().includes(term.toLowerCase()) ||
            q.question.toLowerCase().includes(term.toLowerCase())
          );

          if (isRelevant) {
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
              const questionObj = {
                stage: allQuestions.length + followUpQuestions.length + 1,
                question: q.question,
                options,
                isMultiChoice: q.multi_choice || false
              };

              if (q.follow_up_questions && Array.isArray(q.follow_up_questions)) {
                questionObj.isFinal = false;
                allQuestions.push(questionObj);

                q.follow_up_questions.forEach((followUp, index) => {
                  if (followUp.question && (Array.isArray(followUp.options) || Array.isArray(followUp.selections))) {
                    const followUpOptions = Array.isArray(followUp.options) 
                      ? followUp.options.map((opt, idx) => ({
                          id: `${columnKey}-followup-${index}-${idx}`,
                          label: typeof opt === 'string' ? opt : opt.label || String(opt)
                        }))
                      : followUp.selections.map((label, idx) => ({
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

    // Sort and limit questions
    const finalQuestions = [...allQuestions, ...followUpQuestions]
      .sort((a, b) => a.stage - b.stage)
      .slice(0, 30);

    console.log(`Generated ${finalQuestions.length} questions`);
    console.log('Final questions:', JSON.stringify(finalQuestions, null, 2));

    return new Response(JSON.stringify({
      questions: finalQuestions,
      totalStages: finalQuestions.length,
      analysis: {
        categories,
        tasks,
        materials,
        dimensions,
        requirements
      }
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