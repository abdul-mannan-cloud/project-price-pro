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
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

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
      EdgeRuntime.waitUntil(generateAIQuestions(projectDescription, matchedQuestions, supabaseUrl, supabaseKey, llamaApiKey));
      return new Response(JSON.stringify({ 
        questions: matchedQuestions,
        status: 'partial',
        message: 'Template questions ready, AI questions processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no template questions, wait for AI questions
    const aiQuestions = await generateAIQuestions(projectDescription, matchedQuestions, supabaseUrl, supabaseKey, llamaApiKey);
    
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
  supabaseKey: string,
  llamaApiKey: string | undefined
) {
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
            content: `You are a construction estimator assistant. Generate additional questions for a construction/renovation project. 
            Avoid duplicating these existing questions: ${existingQuestionsText}.
            Return ONLY a valid JSON array with this exact format, no other text:
            [{"question": "Question text here?", "options": ["Option 1", "Option 2", "Option 3"], "isMultiChoice": false}]`
          },
          {
            role: "user",
            content: `Generate ${4 - existingQuestions.length} questions for this project: ${projectDescription}`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!llamaResponse.ok) {
      throw new Error(`Llama API error: ${llamaResponse.statusText}`);
    }

    const aiResult = await llamaResponse.json();
    console.log('Raw AI response:', aiResult);

    if (!aiResult.choices?.[0]?.message?.content) {
      throw new Error('Invalid AI response format');
    }

    const content = aiResult.choices[0].message.content.trim();
    console.log('Parsing AI content:', content);

    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Try to extract JSON array if the response contains additional text
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsedContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse AI response as JSON');
      }
    }

    // Validate and format the questions
    const formattedQuestions = parsedContent.map((q: any) => ({
      question: q.question,
      options: q.options.map((label: string, idx: number) => ({
        id: idx.toString(),
        label: String(label)
      })),
      isMultiChoice: Boolean(q.isMultiChoice)
    }));
      
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
        'AI Generated': formattedQuestions
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to update AI questions in database');
    }

    return formattedQuestions;
  } catch (error) {
    console.error('Error generating AI questions:', error);
    return [];
  }
}