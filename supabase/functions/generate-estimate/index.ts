
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIMEOUT = 30000; // 30 seconds

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timeoutId = setTimeout(() => {
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

    // Prepare the message content
    let messageContent = `Based on the following information, generate a construction cost estimate:
    Category: ${category || 'General Construction'}
    Description: ${projectDescription || 'Project estimate'}
    Questions and Answers:
    ${formattedAnswers.map(cat => `
    Category: ${cat.category}
    ${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}`;

    // Prepare the function schema for cost estimation
    const estimateFunction = {
      name: "generate_construction_estimate",
      description: "Generate a detailed construction cost estimate",
      parameters: {
        type: "object",
        properties: {
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                subgroups: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                            quantity: { type: "number" },
                            unit: { type: "string" },
                            unitAmount: { type: "number" },
                            totalPrice: { type: "number" }
                          }
                        }
                      },
                      subtotal: { type: "number" }
                    }
                  }
                }
              }
            }
          },
          totalCost: { type: "number" },
          ai_generated_title: { type: "string" },
          ai_generated_message: { type: "string" }
        },
        required: ["groups", "totalCost", "ai_generated_title", "ai_generated_message"]
      }
    };

    // Prepare the API request
    const apiRequest = {
      messages: [
        {
          role: "system",
          content: "You are a construction cost estimator. Generate detailed cost estimates based on project requirements."
        },
        {
          role: "user",
          content: messageContent
        }
      ],
      functions: [estimateFunction],
      function_call: {
        name: "generate_construction_estimate"
      },
      model: "llama-13b-chat",
      max_tokens: 500,
      temperature: 0.1,
      top_p: 1.0,
      frequency_penalty: 1.0,
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
            text: "Consider this image when generating the estimate."
          }
        ]
      });
    }

    try {
      console.log('Making request to LLaMA API...');
      const response = await fetch('https://api.llama-api.com/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${llamaApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLaMA API request failed: ${errorText}`);
      }

      const data = await response.json();
      console.log('Received response from LLaMA API');

      let parsedEstimate;
      try {
        const functionCall = data.choices[0]?.message?.function_call;
        if (!functionCall || !functionCall.arguments) {
          throw new Error('Invalid response format: missing function call arguments');
        }

        parsedEstimate = JSON.parse(functionCall.arguments);
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        throw new Error('Failed to parse estimate data');
      }

      if (!parsedEstimate || !parsedEstimate.groups || !Array.isArray(parsedEstimate.groups)) {
        throw new Error('Invalid estimate format: missing required fields');
      }

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      const { error: updateError } = await supabaseAdmin
        .from('leads')
        .update({ 
          estimate_data: parsedEstimate,
          status: 'complete',
          estimated_cost: parsedEstimate.totalCost || 0,
          ai_generated_title: parsedEstimate.ai_generated_title,
          ai_generated_message: parsedEstimate.ai_generated_message
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
      
      // Update lead status to error
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
