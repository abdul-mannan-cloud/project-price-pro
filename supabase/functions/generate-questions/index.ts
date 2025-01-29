import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Option {
  Task: string;
  'Q1 Category': string;
  'Q1 Selection': string;
  'Q2 Category': string;
  'Q2 Selection': string;
  'Q3 Category': string;
  'Q3 Selection': string;
  'Material Applicable Question': string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription } = await req.json();
    console.log('Processing project description:', projectDescription);

    // Fetch options from the database
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = Deno.env;
    const optionsResponse = await fetch(`${SUPABASE_URL}/rest/v1/Options`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch options from database');
    }

    const options: Option[] = await optionsResponse.json();
    console.log('Fetched options:', options);

    // Find matching tasks in the description
    const matchingTasks = options.filter(option => 
      option.Task && projectDescription.toLowerCase().includes(option.Task.toLowerCase())
    );

    console.log('Matching tasks:', matchingTasks);

    if (matchingTasks.length > 0) {
      // Generate questions based on matching tasks
      const questions = [];
      
      // Add square footage question first
      questions.push({
        question: "What is the approximate square footage of the project area?",
        options: [
          { id: "size1", label: "Less than 100 sq ft" },
          { id: "size2", label: "100-250 sq ft" },
          { id: "size3", label: "250-500 sq ft" },
          { id: "size4", label: "More than 500 sq ft" }
        ]
      });

      // Process each matching task
      for (const task of matchingTasks) {
        // Add Q1 questions if category exists
        if (task['Q1 Category'] && task['Q1 Selection']) {
          const options = task['Q1 Selection'].split(',').map((opt, idx) => ({
            id: `q1_${idx}`,
            label: opt.trim()
          }));
          
          if (options.length > 0) {
            questions.push({
              question: task['Q1 Category'],
              options: options.slice(0, 4) // Limit to 4 options
            });
          }
        }

        // Add Q2 questions if category exists
        if (task['Q2 Category'] && task['Q2 Selection']) {
          const options = task['Q2 Selection'].split(',').map((opt, idx) => ({
            id: `q2_${idx}`,
            label: opt.trim()
          }));
          
          if (options.length > 0) {
            questions.push({
              question: task['Q2 Category'],
              options: options.slice(0, 4)
            });
          }
        }

        // Add Q3 questions if category exists
        if (task['Q3 Category'] && task['Q3 Selection']) {
          const options = task['Q3 Selection'].split(',').map((opt, idx) => ({
            id: `q3_${idx}`,
            label: opt.trim()
          }));
          
          if (options.length > 0) {
            questions.push({
              question: task['Q3 Category'],
              options: options.slice(0, 4)
            });
          }
        }

        // Add material question if applicable
        if (task['Material Applicable Question']) {
          questions.push({
            question: task['Material Applicable Question'],
            options: [
              { id: "mat1", label: "Standard grade" },
              { id: "mat2", label: "Mid-grade" },
              { id: "mat3", label: "Premium grade" },
              { id: "mat4", label: "Need recommendations" }
            ]
          });
        }
      }

      // Add timeline question last
      questions.push({
        question: "When would you like this project completed?",
        options: [
          { id: "time1", label: "As soon as possible" },
          { id: "time2", label: "Within 2 weeks" },
          { id: "time3", label: "Within 1 month" },
          { id: "time4", label: "Flexible timeline" }
        ]
      });

      console.log('Generated questions:', questions);
      return new Response(JSON.stringify({ questions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no matching tasks, use Llama API as fallback
    console.log('No matching tasks found, using Llama API as fallback');
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY environment variable');
    }

    const systemPrompt = `Generate focused questions about project requirements.
    Each question MUST:
    - Be specific and actionable
    - Focus on scope, measurements, and materials
    - Have exactly 4 relevant options
    - Avoid style/design preferences
    
    Return a JSON object with this structure:
    {
      "questions": [
        {
          "question": "string",
          "options": [
            { "id": "string", "label": "string" }
          ]
        }
      ]
    }`;

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user",
            content: `Generate questions for: ${projectDescription}`
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!llamaResponse.ok) {
      throw new Error(`Llama API error: ${llamaResponse.status}`);
    }

    const data = await llamaResponse.json();
    console.log('Llama response:', data);

    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid response format from Llama');
    }

    const questionsData = JSON.parse(data.choices[0].message.content);
    return new Response(JSON.stringify(questionsData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    // Return default questions as fallback
    return new Response(JSON.stringify({
      questions: [
        {
          question: "What is the approximate square footage of the project area?",
          options: [
            { id: "size1", label: "Less than 100 sq ft" },
            { id: "size2", label: "100-250 sq ft" },
            { id: "size3", label: "250-500 sq ft" },
            { id: "size4", label: "More than 500 sq ft" }
          ]
        },
        {
          question: "When would you like this project completed?",
          options: [
            { id: "time1", label: "As soon as possible" },
            { id: "time2", label: "Within 2 weeks" },
            { id: "time3", label: "Within 1 month" },
            { id: "time4", label: "Flexible timeline" }
          ]
        }
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});