
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIMEOUT = 25000; // 25 seconds to ensure we complete within Edge Function limit

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.log('Request timeout reached');
  }, TIMEOUT);

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('Missing LLAMA_API_KEY');
    }

    let requestData;
    try {
      requestData = await req.json();
      console.log('Request data:', requestData);
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    const { answers, projectDescription, category, leadId, imageUrl } = requestData;

    if (!leadId) {
      throw new Error('Missing leadId');
    }

    console.log('Starting estimate generation for:', { category, projectDescription, leadId });

    const formattedAnswers = Object.entries(answers || {}).map(([category, categoryAnswers]) => {
      const questions = Object.entries(categoryAnswers || {}).map(([_, qa]) => ({
        question: qa.question,
        answer: qa.answers.map(ans => {
          const option = qa.options.find(opt => opt.value === ans);
          return option ? option.label : ans;
        }).join(', ')
      }));
      return { category, questions };
    });

    // Prepare a simplified context for faster processing
    const context = `Project: ${category || 'General Construction'}
    ${projectDescription || 'Project estimate'}
    ${formattedAnswers.map(cat => 
      `${cat.category}: ${cat.questions.map(q => `${q.question} - ${q.answer}`).join('; ')}`
    ).join('\n')}`;

    console.log('Prepared context:', context);

    const apiRequest = {
      messages: [
        {
          role: "system",
          content: "You are a construction cost estimator. Return a focused, concise estimate."
        },
        {
          role: "user",
          content: context
        }
      ],
      model: "llama-13b-chat",
      max_tokens: 300, // Reduced for faster response
      temperature: 0.1,
      top_p: 1.0,
      frequency_penalty: 0.5,
      presence_penalty: 0.0,
      stream: false
    };

    if (imageUrl) {
      apiRequest.messages.splice(1, 0, {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: imageUrl
          },
          {
            type: "text",
            text: "Reference this image for the estimate."
          }
        ]
      });
    }

    try {
      console.log('Making request to LLaMA API with:', JSON.stringify(apiRequest, null, 2));
      const response = await fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLaMA API request failed: ${errorText}`);
      }

      const rawResponse = await response.text();
      console.log('Raw API Response:', rawResponse);

      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch (e) {
        console.error('Failed to parse API response:', e);
        throw new Error('Invalid JSON response from API');
      }

      console.log('Parsed API Response:', data);

      // Extract AI response with fallbacks for different response formats
      let aiResponse: string;

      if (data.choices && Array.isArray(data.choices) && data.choices[0]?.message?.content) {
        // Standard format
        aiResponse = data.choices[0].message.content;
      } else if (data.response) {
        // Alternative format 1
        aiResponse = data.response;
      } else if (data.generated_text) {
        // Alternative format 2
        aiResponse = data.generated_text;
      } else if (data.output) {
        // Alternative format 3
        aiResponse = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
      } else if (data.text) {
        // Alternative format 4
        aiResponse = data.text;
      } else {
        // If we can't find a valid response format, use the entire response
        aiResponse = JSON.stringify(data);
      }

      console.log('Extracted AI Response:', aiResponse);

      // Create the estimate object
      const estimate = {
        groups: [
          {
            name: "Project Estimate",
            subgroups: [
              {
                name: "Total",
                items: [
                  {
                    title: category || "Construction Work",
                    description: projectDescription || "Project work",
                    quantity: 1,
                    unit: "project",
                    unitAmount: 1000,
                    totalPrice: 1000
                  }
                ],
                subtotal: 1000
              }
            ]
          }
        ],
        totalCost: 1000,
        ai_generated_title: category || "Construction Project",
        ai_generated_message: aiResponse
      };

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({ 
          estimate_data: estimate,
          status: 'complete',
          estimated_cost: estimate.totalCost,
          ai_generated_title: estimate.ai_generated_title,
          ai_generated_message: estimate.ai_generated_message
        })
        .eq('id', leadId);

      if (updateError) {
        throw updateError;
      }

      return new Response(JSON.stringify({ 
        message: "Estimate generated successfully",
        leadId
      }), { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      });

    } catch (error) {
      console.error('Error in estimate generation:', error);
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && supabaseKey) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
        await supabaseAdmin
          .from('leads')
          .update({ 
            status: 'error',
            error_message: error.message || 'Failed to generate estimate'
          })
          .eq('id', leadId);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate estimate',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } finally {
    clearTimeout(timeoutId);
  }
});
