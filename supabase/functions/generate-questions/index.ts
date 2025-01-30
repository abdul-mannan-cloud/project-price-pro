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

    // Process all questions from the Options table
    const matchedQuestions = [];
    if (optionsData.length > 0) {
      const options = optionsData[0];
      const questionColumns = ['Question 1', 'Question 2', 'Question 3', 'Question 4'];
      
      for (const column of questionColumns) {
        const questionData = options[column];
        if (questionData && typeof questionData === 'object') {
          // Check if the task is relevant to the project description
          const isRelevant = isTaskRelevant(projectDescription.toLowerCase(), questionData.task?.toLowerCase());
          
          if (isRelevant) {
            console.log(`Matched question from ${column}:`, questionData);
            matchedQuestions.push({
              question: questionData.question,
              options: questionData.selections?.map((label: string, idx: number) => ({
                id: idx.toString(),
                label
              })) || [],
              isMultiChoice: questionData.multi_choice || false
            });
          }
        }
      }
    }

    // Generate additional AI questions if needed
    let aiQuestions = [];
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    
    if (llamaApiKey && matchedQuestions.length < 4) {
      console.log('Generating additional AI questions');
      
      const existingQuestions = matchedQuestions.map(q => q.question);
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
              Avoid duplicating these existing questions: ${existingQuestions.join(', ')}.
              Each question should:
              - Be specific and actionable
              - Have 3-4 relevant options
              - Help understand project requirements better
              Format as JSON array: [{"question": "...", "options": ["opt1", "opt2", "opt3"], "isMultiChoice": boolean}]`
            },
            {
              role: "user",
              content: `Generate ${4 - matchedQuestions.length} additional questions for this project: ${projectDescription}`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }),
      });

      if (llamaResponse.ok) {
        const aiResult = await llamaResponse.json();
        try {
          const content = aiResult.choices[0].message.content;
          const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          aiQuestions = parsedContent.map((q: any) => ({
            question: q.question,
            options: q.options.map((label: string, idx: number) => ({
              id: idx.toString(),
              label
            })),
            isMultiChoice: q.isMultiChoice || false
          }));
          console.log('Generated AI questions:', aiQuestions);
        } catch (error) {
          console.error('Failed to parse AI response:', error);
        }
      }
    }

    // Combine matched and AI-generated questions
    const allQuestions = [...matchedQuestions, ...aiQuestions];
    console.log('Final questions:', allQuestions);

    return new Response(JSON.stringify({ questions: allQuestions }), {
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

// Helper function to determine if a task is relevant to the project description
function isTaskRelevant(description: string, task?: string): boolean {
  if (!task) return false;
  
  // Direct keyword match
  if (description.includes(task)) return true;
  
  // Common synonyms and related terms
  const taskMappings: Record<string, string[]> = {
    'kitchen': ['cooking', 'countertop', 'cabinet', 'appliance'],
    'bathroom': ['bath', 'shower', 'toilet', 'vanity'],
    'painting': ['paint', 'color', 'wall', 'finish'],
    'flooring': ['floor', 'tile', 'hardwood', 'carpet'],
    // Add more mappings as needed
  };
  
  const relatedTerms = taskMappings[task] || [];
  return relatedTerms.some(term => description.includes(term));
}