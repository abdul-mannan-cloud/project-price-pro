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
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    const { answers, projectDescription, category } = requestData;
    console.log('Generating estimate for:', { category, projectDescription });

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

        try {
          const [titleResponse, messageResponse] = await Promise.all([
            fetch('https://api.llama-api.com/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${llamaApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [{
                  role: 'system',
                  content: 'Generate a concise project title.'
                }, {
                  role: 'user',
                  content: `Based on this project description and answers, generate a concise project title (4 words or less):
                  Category: ${category || 'General Construction'}
                  Description: ${projectDescription || 'Project estimate'}
                  ${formattedAnswers.map(cat => 
                    cat.questions.map(q => `${q.question}: ${q.answer}`).join('\n')
                  ).join('\n')}`
                }],
                temperature: 0.2,
                response_format: { type: "text" }
              }),
            }),
            fetch('https://api.llama-api.com/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${llamaApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messages: [{
                  role: 'system',
                  content: 'Generate a clear project overview.'
                }, {
                  role: 'user',
                  content: `Based on this project description and answers, generate a clear, professional overview of the project scope (2-3 sentences):
                  Category: ${category || 'General Construction'}
                  Description: ${projectDescription || 'Project estimate'}
                  ${formattedAnswers.map(cat => 
                    cat.questions.map(q => `${q.question}: ${q.answer}`).join('\n')
                  ).join('\n')}`
                }],
                temperature: 0.2,
                response_format: { type: "text" }
              }),
            })
          ]);

          if (titleResponse.ok) {
            const titleData = await titleResponse.json();
            aiTitle = titleData.choices?.[0]?.message?.content?.trim() || aiTitle;
          }

          if (messageResponse.ok) {
            const messageData = await messageResponse.json();
            aiMessage = messageData.choices?.[0]?.message?.content?.trim() || aiMessage;
          }
        } catch (error) {
          console.error('Error generating title or message:', error);
          // Continue with default values if title/message generation fails
        }

        const response = await fetch('https://api.llama-api.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${llamaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{
              role: 'system',
              content: 'You are a construction cost estimator. Generate estimates in JSON format only.'
            }, {
              role: 'user',
              content: `Based on the following project details, generate a detailed construction estimate in JSON format only:
              Category: ${category || 'General Construction'}
              Description: ${projectDescription || 'Project estimate'}
              Questions and Answers:
              ${formattedAnswers.map(cat => `
              Category: ${cat.category}
              ${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}`
            }],
            temperature: 0.2,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          throw new Error(`Llama API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Invalid estimate response format');
        }

        const parsedEstimate = typeof content === 'string' ? JSON.parse(content) : content;
        
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

        if (requestData.leadId) {
          const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({ 
              estimate_data: parsedEstimate,
              status: 'complete',
              estimated_cost: parsedEstimate.totalCost || 0
            })
            .eq('id', requestData.leadId);

          if (updateError) {
            console.error('Error updating lead:', updateError);
          }
        }

        console.log('Background estimate generation completed successfully');
      } catch (error) {
        console.error('Background task error:', error);
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
