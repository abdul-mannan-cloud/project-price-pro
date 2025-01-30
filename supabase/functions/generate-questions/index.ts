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
    const { projectDescription, imageUrl } = await req.json();
    console.log('Processing request for:', { projectDescription, imageUrl });

    // Get questions from Options table
    const { data: optionsData, error: optionsError } = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/Options?select=*`,
      {
        headers: {
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
      }
    ).then(r => r.json());

    if (optionsError) {
      console.error('Error fetching options:', optionsError);
      throw optionsError;
    }

    // Extract and process questions from Options table
    const predefinedQuestions = [];
    if (optionsData && optionsData.length > 0) {
      const firstRow = optionsData[0];
      for (let i = 1; i <= 4; i++) {
        const questionKey = `Question ${i}`;
        if (firstRow[questionKey]) {
          const questionData = firstRow[questionKey];
          console.log(`Processing ${questionKey}:`, questionData);
          
          // Check if the task matches the project description
          if (questionData.task && projectDescription.toLowerCase().includes(questionData.task.toLowerCase())) {
            predefinedQuestions.push({
              question: questionData.question,
              options: questionData.options.map((opt: string, idx: number) => ({
                id: idx.toString(),
                label: opt
              })),
              isMultiChoice: questionData.type === 'multi_choice'
            });
          }
        }
      }
    }

    console.log('Matched predefined questions:', predefinedQuestions);

    // Get template questions based on keywords
    const keywords = projectDescription.toLowerCase().split(' ');
    const { data: templateData, error: templateError } = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/question_templates?select=*`,
      {
        headers: {
          'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
      }
    ).then(r => r.json());

    if (templateError) {
      console.error('Error fetching templates:', templateError);
      throw templateError;
    }

    // Filter and format template questions
    const matchingTemplates = templateData?.filter((template: any) => 
      keywords.some(keyword => template.task.toLowerCase().includes(keyword))
    ).map((template: any) => ({
      question: template.question,
      options: Array.isArray(template.options) 
        ? template.options.map((opt: any, idx: number) => ({
            id: idx.toString(),
            label: typeof opt === 'string' ? opt : opt.label || String(opt)
          }))
        : [],
      isMultiChoice: template.question_type === 'multi_choice'
    })) || [];

    console.log('Matching templates:', matchingTemplates);

    // Use AI to analyze project description and generate additional questions
    const generateAIQuestions = async () => {
      try {
        const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
        if (!llamaApiKey) {
          console.error('Missing LLAMA_API_KEY');
          return [];
        }

        const systemPrompt = `You are an AI assistant that helps generate relevant questions for construction project estimates.
        
        Project Description: "${projectDescription}"
        
        Current Questions:
        Predefined: ${JSON.stringify(predefinedQuestions)}
        Templates: ${JSON.stringify(matchingTemplates)}
        
        Generate 2-3 additional relevant questions that don't overlap with existing ones.
        Each question must:
        1. Be specific to the project description
        2. Have exactly 4 relevant options
        3. Focus on timeline, budget, or specific requirements
        
        Return in this exact format:
        {
          "questions": [
            {
              "question": "string",
              "options": [
                { "id": "0", "label": "string" },
                { "id": "1", "label": "string" },
                { "id": "2", "label": "string" },
                { "id": "3", "label": "string" }
              ],
              "isMultiChoice": boolean
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
                content: [
                  { type: "text", text: projectDescription },
                  imageUrl ? { type: "image_url", image_url: imageUrl } : null
                ].filter(Boolean)
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 2000
          }),
        });

        if (!llamaResponse.ok) {
          console.error('Llama API error:', await llamaResponse.text());
          return [];
        }

        const data = await llamaResponse.json();
        console.log('AI response:', data);
        
        const content = data.choices[0].message.content;
        const aiQuestions = typeof content === 'string' ? JSON.parse(content.trim()) : content;
        
        return aiQuestions.questions || [];
      } catch (error) {
        console.error('Error generating AI questions:', error);
        return [];
      }
    };

    // Start with predefined and template questions
    const initialQuestions = [...predefinedQuestions, ...matchingTemplates];
    console.log('Initial questions:', initialQuestions);

    // Start AI question generation in the background
    const aiQuestionsPromise = generateAIQuestions();
    EdgeRuntime.waitUntil(aiQuestionsPromise.then(aiQuestions => {
      console.log('AI questions generated:', aiQuestions);
    }));

    return new Response(JSON.stringify({ 
      questions: initialQuestions,
      needsMoreDetail: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ 
      questions: [],
      needsMoreDetail: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});