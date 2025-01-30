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
            columnData.data.forEach(questionObj => {
              console.log(`Checking task "${questionObj.task}" against description "${description}"`);
              if (isRelevantTask(description, questionObj.task)) {
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

      console.log('Total matched questions:', matchedQuestions.length);
    }

    // Start AI question generation in the background
    const aiQuestionsPromise = generateAIQuestions(projectDescription);
    
    EdgeRuntime.waitUntil(
      aiQuestionsPromise.then(aiQuestions => {
        console.log('AI questions generated:', aiQuestions);
      }).catch(error => {
        console.error('Error generating AI questions:', error);
      })
    );

    // Add final question
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

function isRelevantTask(description: string, task?: string): boolean {
  if (!task || !description) return false;
  
  const normalizedDescription = description.toLowerCase();
  const normalizedTask = task.toLowerCase();

  // Define task keywords and their variations/misspellings
  const taskKeywords: Record<string, string[]> = {
    'kitchen': ['kitchen', 'kitch', 'kitchn', 'kichen', 'cooking', 'countertop', 'cabinet'],
    'bathroom': ['bathroom', 'bath', 'bathrm', 'bathrom', 'restroom', 'washroom', 'shower', 'toilet'],
    'basement': ['basement', 'bsmt', 'basment'],
    'painting': ['paint', 'painting', 'painted', 'paints'],
    'flooring': ['floor', 'flooring', 'flor', 'floors'],
    'roofing': ['roof', 'roofing', 'ruf', 'rooves'],
    'windows': ['window', 'windows', 'windw'],
    'electrical': ['electric', 'electrical', 'elektric', 'wiring'],
    'plumbing': ['plumbing', 'plumb', 'plum', 'pipe'],
    'landscaping': ['landscape', 'landscaping', 'yard', 'garden'],
    'deck': ['deck', 'decking', 'patio', 'porch'],
    'remodel': ['remodel', 'renovation', 'renew', 'update', 'upgrade'],
  };

  // Check if any of the task keywords or their variations are in the description
  for (const [baseKeyword, variations] of Object.entries(taskKeywords)) {
    if (normalizedTask.includes(baseKeyword)) {
      // If the task contains this keyword, check if any of its variations are in the description
      if (variations.some(variation => normalizedDescription.includes(variation))) {
        console.log(`Matched keyword "${baseKeyword}" with variation in description`);
        return true;
      }
    }
  }

  // Direct match check (fallback)
  const directMatch = normalizedDescription.includes(normalizedTask);
  if (directMatch) {
    console.log(`Direct match found for task "${normalizedTask}"`);
  }
  return directMatch;
}

async function generateAIQuestions(description: string) {
  const llama_api_key = Deno.env.get('LLAMA_API_KEY');
  if (!llama_api_key) {
    throw new Error('Missing Llama API key');
  }

  const response = await fetch('https://api.llama-api.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${llama_api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.2-11b-vision',
      messages: [
        {
          role: 'system',
          content: 'Generate relevant questions for a construction project estimate.'
        },
        {
          role: 'user',
          content: description
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    }),
  });

  if (!response.ok) {
    throw new Error(`Llama API error: ${response.status}`);
  }

  return await response.json();
}