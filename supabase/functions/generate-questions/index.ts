import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionData {
  task: string;
  question: string;
  multi_choice: boolean;
  selections: string[];
}

interface ColumnData {
  data: QuestionData[];
}

function parseColumn(columnValue: any): QuestionData[] {
  if (!columnValue) return [];

  let parsed;
  if (typeof columnValue === 'string') {
    try {
      parsed = JSON.parse(columnValue);
    } catch {
      parsed = {};
    }
  } else {
    parsed = columnValue;
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  
  return [parsed];
}

function isMatch(taskValue: string, userInput: string): boolean {
  const taskLower = taskValue.toLowerCase();
  const inputLower = userInput.toLowerCase();
  return inputLower.includes(taskLower);
}

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

    // Fetch the first row from Options table
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/Options?select=*&limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch template questions');
    }

    const optionsData = await optionsResponse.json();
    let allQuestions = [];
    
    if (optionsData.length > 0) {
      const options = optionsData[0];
      const description = projectDescription.toLowerCase();
      
      // Process each question column in sequence
      for (const column of ['Question 1', 'Question 2', 'Question 3', 'Question 4']) {
        try {
          const columnData = options[column] as ColumnData;
          if (columnData?.data && Array.isArray(columnData.data)) {
            const parsedQuestions = parseColumn(columnData);
            console.log(`Processing ${column} with ${parsedQuestions.length} questions`);
            
            const matchedQuestions = parsedQuestions.filter(q => {
              const matches = q.task && isMatch(q.task, description);
              if (matches) {
                console.log(`✅ Matched task "${q.task}" in ${column}`);
              }
              return matches;
            }).map((questionObj, idx) => ({
              stage: parseInt(column.split(' ')[1]),
              question: questionObj.question,
              options: questionObj.selections.map((label, optIdx) => ({
                id: `${column}-${idx}-${optIdx}`,
                label: String(label)
              })),
              isMultiChoice: questionObj.multi_choice
            }));
            
            allQuestions.push(...matchedQuestions);
          }
        } catch (error) {
          console.error(`Error processing ${column}:`, error);
        }
      }
    }

    // Sort questions by stage
    allQuestions.sort((a, b) => a.stage - b.stage);

    // If no matches found, provide default questions
    if (allQuestions.length === 0) {
      console.log('No matching questions found, using defaults');
      allQuestions = [
        {
          stage: 1,
          question: "What type of project are you planning?",
          options: [
            { id: "kitchen", label: "Kitchen Remodel" },
            { id: "bathroom", label: "Bathroom Remodel" },
            { id: "general", label: "General Renovation" },
            { id: "repair", label: "Repair Work" }
          ],
          isMultiChoice: false
        },
        {
          stage: 2,
          question: "What is your estimated budget range?",
          options: [
            { id: "budget1", label: "$5,000 - $15,000" },
            { id: "budget2", label: "$15,000 - $30,000" },
            { id: "budget3", label: "$30,000 - $50,000" },
            { id: "budget4", label: "$50,000+" }
          ],
          isMultiChoice: false
        }
      ];
    }

    // Always add final confirmation question
    allQuestions.push({
      stage: allQuestions.length + 1,
      question: "Ready to view your estimate?",
      options: [
        { id: "yes", label: "Yes, show me my estimate" }
      ],
      isMultiChoice: false,
      isFinal: true
    });

    console.log('Returning questions:', allQuestions);

    return new Response(JSON.stringify({ 
      questions: allQuestions,
      totalStages: allQuestions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});