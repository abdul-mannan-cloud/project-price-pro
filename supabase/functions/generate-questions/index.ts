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

    // Fetch template questions immediately
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
    const matchedQuestions = [];

    // Process template questions first (fast)
    if (optionsData.length > 0) {
      const options = optionsData[0];
      const questionColumns = ['Question 1', 'Question 2', 'Question 3', 'Question 4'];
      const description = projectDescription.toLowerCase();
      
      for (const column of questionColumns) {
        const questionData = options[column];
        if (questionData && typeof questionData === 'object') {
          // Enhanced task matching logic
          const taskMatches = isTaskRelevant(description, questionData.task?.toLowerCase());
          console.log(`Checking ${column} with task "${questionData.task}" - Match: ${taskMatches}`);
          
          if (taskMatches) {
            console.log(`Adding matched question from ${column}:`, questionData.question);
            matchedQuestions.push({
              question: questionData.question,
              options: questionData.selections?.map((label: string, idx: number) => ({
                id: idx.toString(),
                label: String(label)
              })) || [],
              isMultiChoice: questionData.multi_choice || false
            });
          }
        }
      }
    }

    // Return template questions immediately if we have any
    if (matchedQuestions.length > 0) {
      console.log('Returning matched template questions:', matchedQuestions);
      EdgeRuntime.waitUntil(generateAIQuestions(projectDescription, matchedQuestions, supabaseUrl, supabaseKey));
      return new Response(JSON.stringify({ 
        questions: matchedQuestions,
        status: 'partial',
        message: 'Template questions ready, AI questions processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no template questions, wait for AI questions
    const aiQuestions = await generateAIQuestions(projectDescription, matchedQuestions, supabaseUrl, supabaseKey);
    
    return new Response(JSON.stringify({ 
      questions: aiQuestions,
      status: 'complete'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      questions: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function isTaskRelevant(description: string, task?: string): boolean {
  if (!task) return false;
  
  // Direct match
  if (description.includes(task.toLowerCase())) return true;
  
  // Enhanced task mappings with common misspellings and related terms
  const taskMappings: Record<string, string[]> = {
    'kitchen': ['kichen', 'kitchn', 'cooking', 'countertop', 'cabinet', 'appliance'],
    'painting': ['paint', 'wills', 'walls', 'color', 'finish', 'wallpaper'],
    'bathroom': ['bath', 'shower', 'toilet', 'vanity', 'sink'],
    'flooring': ['floor', 'tile', 'hardwood', 'carpet', 'laminate'],
  };
  
  const relatedTerms = taskMappings[task.toLowerCase()] || [];
  return relatedTerms.some(term => description.includes(term));
}

async function generateAIQuestions(
  projectDescription: string, 
  existingQuestions: any[], 
  supabaseUrl: string,
  supabaseKey: string
) {
  const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
  if (!llamaApiKey || existingQuestions.length >= 4) return [];

  try {
    console.log('Generating additional AI questions');
    
    const existingQuestionsText = existingQuestions.map(q => q.question).join(', ');
    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b',
        messages: [
          {
            role: "system",
            content: `Generate additional questions for a construction/renovation project. 
            Avoid duplicating these existing questions: ${existingQuestionsText}.
            Each question should:
            - Be specific and actionable
            - Have 3-4 relevant options
            - Help understand project requirements better
            Format as JSON array: [{"question": "...", "options": ["opt1", "opt2", "opt3"], "isMultiChoice": boolean}]`
          },
          {
            role: "user",
            content: `Generate ${4 - existingQuestions.length} additional questions for this project: ${projectDescription}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (llamaResponse.ok) {
      const aiResult = await llamaResponse.json();
      const content = aiResult.choices[0].message.content;
      const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
      
      // Update existing questions in the database
      const updateResponse = await fetch(`${supabaseUrl}/rest/v1/Options?id=eq.1`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          'AI Generated': parsedContent
        })
      });

      if (!updateResponse.ok) {
        console.error('Failed to update AI questions in database');
      }

      return parsedContent.map((q: any) => ({
        question: q.question,
        options: q.options.map((label: string, idx: number) => ({
          id: idx.toString(),
          label: String(label)
        })),
        isMultiChoice: q.isMultiChoice || false
      }));
    }
  } catch (error) {
    console.error('Error generating AI questions:', error);
  }
  return [];
}