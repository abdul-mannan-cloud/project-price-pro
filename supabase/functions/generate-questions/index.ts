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
    const { projectDescription } = await req.json();
    console.log('Processing request with description:', projectDescription);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

    if (!supabaseUrl || !supabaseKey || !llamaApiKey) {
      throw new Error('Missing required configuration');
    }

    // First, analyze the project description with Llama to identify key components
    const analysisResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          role: 'system',
          content: 'You are a construction project analyzer. Extract key components and materials from the project description.'
        }, {
          role: 'user',
          content: `Analyze this project description and list the main components that need questions: ${projectDescription}`
        }],
        temperature: 0.2,
      }),
    });

    const analysisData = await analysisResponse.json();
    console.log('Llama analysis:', analysisData);

    // Fetch question templates from the Options table
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

    // Process and filter questions based on project components
    const firstRow = optionsData[0];
    const allQuestions = [];
    const processedQuestions = new Set();
    const maxQuestions = 14; // Limit to 14 questions as requested

    // Keywords to match against for this specific type of project
    const keywordGroups = {
      kitchen: ['kitchen', 'cabinets', 'countertops', 'appliances', 'sink'],
      flooring: ['tile', 'floor', '12x12'],
      electrical: ['outlets', 'recessed', 'lights', 'lighting'],
      finishes: ['paint', 'backsplash', 'mosaic', 'baseboard', 'drywall'],
      dimensions: ['ceiling height', 'square feet', 'measurements'],
      budget: ['budget', 'cost', 'grade', 'mid grade'],
    };

    // Process each question column (Question 1 through 4)
    for (let i = 1; i <= 4; i++) {
      const columnKey = `Question ${i}`;
      const jsonData = firstRow[columnKey];
      
      if (!jsonData) continue;

      try {
        const questionData = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        const questions = Array.isArray(questionData) ? questionData : [questionData];
        
        for (const q of questions) {
          if (!q.task || !q.question || processedQuestions.has(q.question)) {
            continue;
          }

          // Check if the question is relevant to our identified components
          let isRelevant = false;
          for (const [category, keywords] of Object.entries(keywordGroups)) {
            if (keywords.some(keyword => 
              q.question.toLowerCase().includes(keyword) || 
              q.task.toLowerCase().includes(keyword)
            )) {
              isRelevant = true;
              break;
            }
          }

          if (!isRelevant) continue;

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

          // Break if we've reached our question limit
          if (allQuestions.length >= maxQuestions) {
            break;
          }
        }

        if (allQuestions.length >= maxQuestions) {
          break;
        }
      } catch (error) {
        console.error(`Error processing ${columnKey}:`, error);
      }
    }

    // Sort questions by relevance to the project
    const sortedQuestions = allQuestions.sort((a, b) => {
      const aRelevance = Object.values(keywordGroups).reduce((sum, keywords) => 
        sum + keywords.filter(k => 
          a.question.toLowerCase().includes(k.toLowerCase())
        ).length, 0
      );
      const bRelevance = Object.values(keywordGroups).reduce((sum, keywords) => 
        sum + keywords.filter(k => 
          b.question.toLowerCase().includes(k.toLowerCase())
        ).length, 0
      );
      return bRelevance - aRelevance;
    });

    // Take only the top 14 most relevant questions
    const finalQuestions = sortedQuestions.slice(0, maxQuestions);
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