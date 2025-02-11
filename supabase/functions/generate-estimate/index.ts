
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const MAX_RETRIES = 3;
const INITIAL_TIMEOUT = 60000; // 60 seconds
const BACKOFF_MULTIPLIER = 1.5;

async function callLlamaAPI(payload: any, attempt = 1): Promise<Response> {
  const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
  if (!llamaApiKey) {
    throw new Error('Missing LLAMA_API_KEY');
  }

  const timeout = INITIAL_TIMEOUT * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log(`Request timeout after ${timeout}ms (attempt ${attempt})`);
    controller.abort();
  }, timeout);

  try {
    console.log(`Attempt ${attempt}: Making request to Llama API with ${timeout}ms timeout`);
    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Llama API error (attempt ${attempt}):`, errorText);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying... Attempt ${attempt + 1} of ${MAX_RETRIES}`);
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return callLlamaAPI(payload, attempt + 1);
      }
      
      throw new Error(`Llama API error: ${response.status}`);
    }

    // Validate JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Invalid response format: expected JSON');
    }

    const text = await response.text();
    try {
      JSON.parse(text); // Validate JSON structure
      console.log(`Attempt ${attempt}: Successfully received and validated JSON response`);
      return new Response(text, {
        headers: {
          'content-type': 'application/json',
        }
      });
    } catch (e) {
      console.error('Invalid JSON response:', text);
      throw new Error('Invalid JSON response from Llama API');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Request aborted after ${timeout}ms (attempt ${attempt})`);
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying after timeout... Attempt ${attempt + 1} of ${MAX_RETRIES}`);
        return callLlamaAPI(payload, attempt + 1);
      }
      throw new Error('All attempts timed out');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    let requestData;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('Error parsing request body:', error);
      throw new Error('Invalid request body');
    }

    const { answers, projectDescription, category, refreshOnly, leadId } = requestData;
    console.log('Generating estimate for:', { category, projectDescription, answers });

    // Format answers for better prompt context
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

    // Generate estimate
    const llamaPayload = {
      messages: [{
        role: 'system',
        content: `You are a construction cost estimator. Generate detailed estimates in this exact JSON format:
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
          "totalCost": number,
          "ai_generated_title": "Project Title",
          "ai_generated_message": "Project Overview"
        }`
      }, {
        role: 'user',
        content: `Based on these project details, generate a detailed construction estimate:
        Category: ${category || 'General Construction'}
        Description: ${projectDescription || 'Project estimate'}
        Questions and Answers:
        ${formattedAnswers.map(cat => `
        Category: ${cat.category}
        ${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}`
      }],
      model: "llama3.2-11b-vision",
      temperature: 0.2,
      response_format: { type: "json_object" }
    };

    const response = await callLlamaAPI(llamaPayload);
    const data = await response.json();
    console.log('Llama API response:', data);

    const estimateData = data.choices?.[0]?.message?.content;
    if (!estimateData) {
      throw new Error('Invalid estimate response format');
    }

    const parsedEstimate = typeof estimateData === 'string' ? JSON.parse(estimateData) : estimateData;
    
    // Update the lead with the estimate if we have a leadId
    if (leadId) {
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
          estimated_cost: parsedEstimate.totalCost || 0
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead:', updateError);
      }
    }

    // Return immediate response
    return new Response(
      JSON.stringify(parsedEstimate),
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
