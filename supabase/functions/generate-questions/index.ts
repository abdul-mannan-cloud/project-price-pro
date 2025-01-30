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
    let matchedQuestions = [];

    if (optionsData.length > 0) {
      const options = optionsData[0];
      const description = projectDescription.toLowerCase();
      
      // Process each question column in order
      ['Question 1', 'Question 2', 'Question 3', 'Question 4'].forEach(column => {
        try {
          const columnData = options[column] as ColumnData;
          if (columnData?.data && Array.isArray(columnData.data)) {
            // Process each question object in the column's data array
            columnData.data.forEach(questionObj => {
              if (isTaskRelevant(description, questionObj.task?.toLowerCase())) {
                matchedQuestions.push({
                  question: questionObj.question,
                  options: questionObj.selections.map((label, idx) => ({
                    id: idx.toString(),
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

    // Add final contact info question
    if (matchedQuestions.length > 0) {
      matchedQuestions.push({
        question: "Ready to view your estimate?",
        options: [
          { id: "yes", label: "Yes, show me my estimate" }
        ],
        isMultiChoice: false,
        isFinal: true
      });
    } else {
      // Fallback questions if no matches found
      matchedQuestions = [
        {
          question: "What is the main focus of your project?",
          options: [
            { id: "1", label: "New Construction" },
            { id: "2", label: "Renovation" },
            { id: "3", label: "Repair" }
          ],
          isMultiChoice: false
        },
        {
          question: "Ready to view your estimate?",
          options: [
            { id: "yes", label: "Yes, show me my estimate" }
          ],
          isMultiChoice: false,
          isFinal: true
        }
      ];
    }

    console.log('Final matched questions:', matchedQuestions);
    return new Response(JSON.stringify({ questions: matchedQuestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    // Return fallback questions with 200 status
    return new Response(JSON.stringify({ 
      questions: [
        {
          question: "What type of project are you interested in?",
          options: [
            { id: "1", label: "New Construction" },
            { id: "2", label: "Renovation" },
            { id: "3", label: "Repair" }
          ],
          isMultiChoice: false
        },
        {
          question: "Ready to view your estimate?",
          options: [
            { id: "yes", label: "Yes, show me my estimate" }
          ],
          isMultiChoice: false,
          isFinal: true
        }
      ]
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function isTaskRelevant(description: string, task?: string): boolean {
  if (!task || !description) return false;
  
  // Define task-specific keywords and related terms
  const taskMappings: Record<string, string[]> = {
    'kitchen': ['kitchen', 'cooking', 'countertop', 'cabinet', 'appliance', 'sink', 'stove', 'oven', 'refrigerator'],
    'bathroom': ['bath', 'shower', 'toilet', 'vanity', 'sink', 'plumbing', 'tile', 'faucet'],
    'flooring': ['floor', 'tile', 'hardwood', 'carpet', 'laminate', 'vinyl', 'concrete'],
    'lighting': ['light', 'fixture', 'chandelier', 'lamp', 'sconce', 'pendant', 'recessed'],
    'painting': ['paint', 'walls', 'color', 'finish', 'wallpaper', 'coating'],
    'electrical': ['electric', 'wiring', 'outlet', 'switch', 'panel'],
    'plumbing': ['plumb', 'pipe', 'water', 'drain', 'faucet', 'sink', 'toilet'],
    'outdoor': ['outdoor', 'exterior', 'yard', 'garden', 'patio', 'deck'],
    'windows': ['window', 'glass', 'frame', 'seal', 'pane'],
    'doors': ['door', 'frame', 'handle', 'lock', 'hinge'],
  };
  
  const taskTerms = [
    task.toLowerCase(), 
    ...(taskMappings[task.toLowerCase()] || [])
  ];
  
  return taskTerms.some(term => description.includes(term));
}