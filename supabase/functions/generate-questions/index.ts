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
    console.log('Fetched options data:', optionsData);
    
    let matchedQuestions = [];

    if (optionsData.length > 0) {
      const options = optionsData[0];
      const description = projectDescription.toLowerCase();
      
      // Process each question column in order
      ['Question 1', 'Question 2', 'Question 3', 'Question 4'].forEach(column => {
        try {
          console.log(`Processing ${column}:`, options[column]);
          const columnData = options[column] as ColumnData;
          if (columnData?.data && Array.isArray(columnData.data)) {
            columnData.data.forEach(questionObj => {
              if (questionObj.task && description.includes(questionObj.task.toLowerCase())) {
                console.log(`✅ Matched task "${questionObj.task}" in ${column}`);
                matchedQuestions.push({
                  question: questionObj.question,
                  options: questionObj.selections.map((label, idx) => ({
                    id: `${column}-${idx}`,
                    label: String(label)
                  })),
                  isMultiChoice: questionObj.multi_choice
                });
              }
            });
          }
        } catch (error) {
          console.error(`Error processing ${column}:`, error);
        }
      });
    }

    // If no matches found, provide default questions
    if (matchedQuestions.length === 0) {
      matchedQuestions = [
        {
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
    matchedQuestions.push({
      question: "Ready to view your estimate?",
      options: [
        { id: "yes", label: "Yes, show me my estimate" }
      ],
      isMultiChoice: false,
      isFinal: true
    });

    console.log('Returning questions:', matchedQuestions);

    return new Response(JSON.stringify({ questions: matchedQuestions }), {
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