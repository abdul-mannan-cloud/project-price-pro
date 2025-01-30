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
    let questions = [];

    // Process all question columns
    if (optionsData.length > 0) {
      const options = optionsData[0];
      const description = projectDescription.toLowerCase();
      
      ['Question 1', 'Question 2', 'Question 3', 'Question 4'].forEach(column => {
        const questionData = options[column];
        if (questionData && typeof questionData === 'object') {
          if (isTaskRelevant(description, questionData.task?.toLowerCase())) {
            questions.push({
              question: questionData.question,
              options: questionData.selections?.map((label: string, idx: number) => ({
                id: idx.toString(),
                label: String(label)
              })) || [],
              isMultiChoice: Boolean(questionData.multi_choice)
            });
          }
        }
      });
    }

    // Generate additional AI questions for uncovered aspects
    if (llamaApiKey) {
      console.log('Generating additional AI questions');
      
      const existingQuestionsText = questions.map(q => q.question).join(', ');
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
              content: `You are a construction estimator assistant. Generate additional questions for aspects of the project not covered by these existing questions: ${existingQuestionsText}.
              Each question must specify if it's multi-choice (isMultiChoice: true) or single-choice (isMultiChoice: false).
              Return a JSON array with this format: [{"question": "Question text?", "options": ["Option 1", "Option 2", "Option 3"], "isMultiChoice": false}]`
            },
            {
              role: "user",
              content: `Generate relevant questions for uncovered aspects of this project: ${projectDescription}`
            }
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!llamaResponse.ok) {
        throw new Error(`Llama API error: ${llamaResponse.status}`);
      }

      const aiResult = await llamaResponse.json();
      console.log('AI response:', aiResult);

      if (aiResult.choices?.[0]?.message?.content) {
        try {
          const aiQuestions = JSON.parse(aiResult.choices[0].message.content);
          questions = [
            ...questions,
            ...aiQuestions.map((q: any) => ({
              question: q.question,
              options: q.options.map((label: string, idx: number) => ({
                id: idx.toString(),
                label: String(label)
              })),
              isMultiChoice: Boolean(q.isMultiChoice)
            }))
          ];
        } catch (error) {
          console.error('Error parsing AI questions:', error);
        }
      }
    }

    // Add final contact info question
    questions.push({
      question: "Ready to view your estimate?",
      options: [
        { id: "yes", label: "Yes, show me my estimate" }
      ],
      isMultiChoice: false,
      isFinal: true
    });

    console.log('Final questions array:', questions);
    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function isTaskRelevant(description: string, task?: string): boolean {
  if (!task) return false;
  
  // Define task-specific keywords and related terms
  const taskMappings: Record<string, string[]> = {
    'kitchen': ['kitchen', 'cooking', 'countertop', 'cabinet', 'appliance', 'sink', 'stove', 'oven', 'refrigerator'],
    'painting': ['paint', 'walls', 'color', 'finish', 'wallpaper', 'coating', 'primer', 'brush', 'roller'],
    'bathroom': ['bath', 'shower', 'toilet', 'vanity', 'sink', 'plumbing', 'tile', 'faucet'],
    'flooring': ['floor', 'tile', 'hardwood', 'carpet', 'laminate', 'vinyl', 'concrete'],
    'electrical': ['electric', 'wiring', 'outlet', 'switch', 'light', 'fixture', 'panel'],
    'plumbing': ['plumb', 'pipe', 'water', 'drain', 'faucet', 'sink', 'toilet'],
    'roofing': ['roof', 'shingle', 'gutter', 'flashing', 'leak', 'vent'],
    'windows': ['window', 'glass', 'frame', 'seal', 'pane', 'screen'],
    'doors': ['door', 'frame', 'handle', 'lock', 'hinge', 'knob'],
    'deck': ['deck', 'patio', 'porch', 'railing', 'stair', 'board'],
    'landscaping': ['yard', 'garden', 'lawn', 'plant', 'tree', 'shrub', 'grass'],
  };
  
  const taskTerms = [
    task.toLowerCase(), 
    ...(taskMappings[task.toLowerCase()] || [])
  ];
  
  // Check if any task-related terms appear in the description
  return taskTerms.some(term => description.includes(term));
}