import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription, imageUrl, previousAnswers, existingQuestions } = await req.json();
    console.log('Generating questions for:', { projectDescription, imageUrl, previousAnswers, existingQuestions });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');

    if (!supabaseUrl || !supabaseKey || !llamaApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get template questions based on keywords - now only requiring one match
    const keywords = projectDescription.toLowerCase().split(/\s+/);
    const { data: templateQuestions, error: templateError } = await supabase
      .from('question_templates')
      .select('*')
      .filter('task', 'in', `(${keywords.join(',')})`)
      .order('category');

    if (templateError) throw templateError;

    // Get predefined questions from Options table
    const { data: optionsData, error: optionsError } = await supabase
      .from('Options')
      .select('*')
      .single();

    if (optionsError) throw optionsError;

    // Modified: Only require one match from either templates or predefined questions
    const hasTemplateMatch = templateQuestions && templateQuestions.length > 0;
    const hasPredefinedQuestions = optionsData && (
      optionsData.Question1 || 
      optionsData.Question2 || 
      optionsData.Question3 || 
      optionsData.Question4
    );

    // If no matches at all, request more details
    if (!hasTemplateMatch && !hasPredefinedQuestions) {
      return new Response(JSON.stringify({ questions: [], needsMoreDetail: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Combine template questions with predefined questions
    let allQuestions = [];

    // Add template questions first
    if (templateQuestions?.length > 0) {
      const mappedTemplateQuestions = templateQuestions.map(template => ({
        question: template.question,
        options: Array.isArray(template.options) 
          ? template.options.map((opt: any, idx: number) => ({
              id: idx.toString(),
              label: String(opt)
            }))
          : [],
        isMultiChoice: template.question_type === 'multi_choice'
      }));
      allQuestions.push(...mappedTemplateQuestions);
    }

    // Add predefined questions from Options table
    const predefinedQuestions = [
      optionsData?.Question1,
      optionsData?.Question2,
      optionsData?.Question3,
      optionsData?.Question4
    ].filter(q => q !== null);

    predefinedQuestions.forEach(q => {
      if (q && typeof q === 'object') {
        allQuestions.push({
          question: q.question || '',
          options: Array.isArray(q.options) 
            ? q.options.map((opt: any, idx: number) => ({
                id: idx.toString(),
                label: String(opt)
              }))
            : [],
          isMultiChoice: q.isMultiChoice || false
        });
      }
    });

    // Generate additional AI questions if needed
    const systemPrompt = `You are an AI assistant helping contractors gather project requirements from customers.
    Based on the project description and image (if provided), generate additional questions that don't overlap with the existing ones.
    
    Existing questions: ${JSON.stringify(existingQuestions)}
    
    Generate questions about aspects not covered by the existing questions, such as:
    1. Timeline expectations
    2. Budget considerations
    3. Property details and constraints
    4. Special requirements or constraints
    
    Each question MUST:
    - Not overlap with existing questions
    - Be customer-focused and help contractors better understand the project needs
    - Have exactly 4 relevant options
    - Be specific and actionable
    - Build upon previous answers if available`;

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Generate additional questions for this project:
            Description: ${projectDescription || "New project inquiry"}
            Previous Answers: ${JSON.stringify(previousAnswers || {}, null, 2)}
            
            Remember:
            - Do not duplicate existing questions
            - Each question must have exactly 4 options
            - Questions should help contractors understand customer needs
            - All questions should be from customer perspective`
          },
          imageUrl ? {
            type: "image_url",
            image_url: imageUrl
          } : null
        ].filter(Boolean)
      }
    ];

    const llamaResponse = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3.2-11b-vision',
        messages,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!llamaResponse.ok) {
      const errorText = await llamaResponse.text();
      console.error('Llama API error response:', errorText);
      throw new Error(`Llama API error: ${llamaResponse.status} ${llamaResponse.statusText}`);
    }

    const data = await llamaResponse.json();
    console.log('Llama raw response:', JSON.stringify(data, null, 2));

    let aiQuestions;
    try {
      const content = data.choices[0].message.content;
      const parsedContent = typeof content === 'string' ? JSON.parse(content.trim()) : content;
      
      if (!parsedContent.questions || !Array.isArray(parsedContent.questions)) {
        console.error('Invalid questions structure:', parsedContent);
        aiQuestions = [];
      } else {
        aiQuestions = parsedContent.questions;
      }

    } catch (error) {
      console.error('Failed to parse or validate Llama response:', error);
      aiQuestions = [];
    }

    // Start AI question generation in the background
    EdgeRuntime.waitUntil((async () => {
      allQuestions.push(...aiQuestions);
    })());

    return new Response(JSON.stringify({ 
      questions: allQuestions,
      needsMoreDetail: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(JSON.stringify({ 
      questions: [],
      error: error.message,
      needsMoreDetail: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});