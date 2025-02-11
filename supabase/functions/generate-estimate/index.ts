
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    const { answers, projectDescription, category, leadId } = requestData;
    console.log('Generating estimate for:', { category, projectDescription, leadId });

    // Start background tasks using EdgeRuntime.waitUntil
    EdgeRuntime.waitUntil((async () => {
      try {
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

        let aiTitle = 'Project Estimate';
        let aiMessage = 'Custom project estimate based on provided specifications.';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout

        try {
          // Get AI-generated title with timeout
          const titleResponse = await fetch('https://api.llama-api.com/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${llamaApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                role: 'system',
                content: 'Generate a concise project title (4 words or less). The title should be professional and descriptive.'
              }, {
                role: 'user',
                content: `Based on this project description and answers, generate a concise project title:
                Category: ${category || 'General Construction'}
                Description: ${projectDescription || 'Project estimate'}
                ${formattedAnswers.map(cat => 
                  cat.questions.map(q => `${q.question}: ${q.answer}`).join('\n')
                ).join('\n')}`
              }],
              model: "llama3.2-11b",
              temperature: 0.2,
              stream: false,
              max_tokens: 500
            }),
          });

          clearTimeout(timeout);

          if (!titleResponse.ok) {
            console.error('Title response error:', await titleResponse.text());
            // Continue with default title instead of throwing
            console.log('Using default title due to API error');
          } else {
            const titleData = await titleResponse.json();
            console.log('Title API response:', titleData);
            if (titleData.choices?.[0]?.message?.content) {
              aiTitle = titleData.choices[0].message.content.trim();
            }
            console.log('Generated title:', aiTitle);
          }

          // Get AI-generated message/overview with timeout
          const messageController = new AbortController();
          const messageTimeout = setTimeout(() => messageController.abort(), 20000);

          const messageResponse = await fetch('https://api.llama-api.com/chat/completions', {
            method: 'POST',
            signal: messageController.signal,
            headers: {
              'Authorization': `Bearer ${llamaApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                role: 'system',
                content: 'Generate a clear, professional project overview (2-3 sentences).'
              }, {
                role: 'user',
                content: `Based on this project description and answers, generate a clear overview:
                Category: ${category || 'General Construction'}
                Description: ${projectDescription || 'Project estimate'}
                ${formattedAnswers.map(cat => 
                  cat.questions.map(q => `${q.question}: ${q.answer}`).join('\n')
                ).join('\n')}`
              }],
              model: "llama3.2-11b",
              temperature: 0.2,
              stream: false,
              max_tokens: 500
            }),
          });

          clearTimeout(messageTimeout);

          if (!messageResponse.ok) {
            console.error('Message response error:', await messageResponse.text());
            // Continue with default message instead of throwing
            console.log('Using default message due to API error');
          } else {
            const messageData = await messageResponse.json();
            console.log('Message API response:', messageData);
            if (messageData.choices?.[0]?.message?.content) {
              aiMessage = messageData.choices[0].message.content.trim();
            }
            console.log('Generated message:', aiMessage);
          }
        } catch (error) {
          console.error('Error generating title or message:', error);
          // Continue with default values
          console.log('Using default title and message due to API error');
        }

        // Generate the main estimate with cost breakdown
        const estimateController = new AbortController();
        const estimateTimeout = setTimeout(() => estimateController.abort(), 30000); // 30 second timeout for main estimate

        try {
          const response = await fetch('https://api.llama-api.com/chat/completions', {
            method: 'POST',
            signal: estimateController.signal,
            headers: {
              'Authorization': `Bearer ${llamaApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [{
                role: 'system',
                content: `You are a construction cost estimator. Generate detailed estimates with realistic costs in this exact JSON format:
                {
                  "groups": [
                    {
                      "name": "Group Name",
                      "description": "Optional group description",
                      "subgroups": [
                        {
                          "name": "Subgroup Name",
                          "items": [
                            {
                              "title": "Item Title",
                              "description": "Item description",
                              "quantity": number,
                              "unit": "optional unit",
                              "unitAmount": number,
                              "totalPrice": number
                            }
                          ],
                          "subtotal": number
                        }
                      ]
                    }
                  ],
                  "totalCost": number
                }`
              }, {
                role: 'user',
                content: `Generate a detailed construction estimate in JSON format based on:
                Category: ${category || 'General Construction'}
                Description: ${projectDescription || 'Project estimate'}
                Questions and Answers:
                ${formattedAnswers.map(cat => `
                Category: ${cat.category}
                ${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}`
              }],
              model: "llama3.2-11b",
              temperature: 0.2,
              stream: false,
              max_tokens: 2000,
              response_format: { type: "json_object" }
            }),
          });

          clearTimeout(estimateTimeout);

          if (!response.ok) {
            console.error('Estimate response error:', await response.text());
            throw new Error(`Llama API error: ${response.status}`);
          }

          const aiResponse = await response.json();
          console.log('Estimate API response:', aiResponse);
          const content = aiResponse.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error('Invalid estimate response format');
          }

          const parsedEstimate = typeof content === 'string' ? JSON.parse(content) : content;
          console.log('Parsed estimate:', parsedEstimate);
          
          // Add the AI generated title and message
          parsedEstimate.ai_generated_title = aiTitle;
          parsedEstimate.ai_generated_message = aiMessage;

          // Update the lead with the estimate
          const supabaseUrl = Deno.env.get('SUPABASE_URL');
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
          
          if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase credentials');
          }

          const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

          if (leadId) {
            console.log('Updating lead with estimate:', leadId);
            const { error: updateError } = await supabaseAdmin
              .from('leads')
              .update({ 
                estimate_data: parsedEstimate,
                status: 'complete',
                estimated_cost: parsedEstimate.totalCost || 0,
                ai_generated_title: aiTitle,
                ai_generated_message: aiMessage
              })
              .eq('id', leadId);

            if (updateError) {
              console.error('Error updating lead:', updateError);
              throw updateError;
            }
            console.log('Successfully updated lead with estimate');
          }

        } catch (error) {
          console.error('Error generating main estimate:', error);
          // Update lead with error status
          if (leadId) {
            const supabaseUrl = Deno.env.get('SUPABASE_URL');
            const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
        } finally {
          clearTimeout(estimateTimeout);
        }

      } catch (error) {
        console.error('Background task error:', error);
        throw error;
      }
    })());

    // Return immediate response
    return new Response(
      JSON.stringify({ message: "Estimate generation started" }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error in generate-estimate function:', error);
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
  }
});
