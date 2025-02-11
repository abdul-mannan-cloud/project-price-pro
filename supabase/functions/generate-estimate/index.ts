
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Increased timeout and adjusted retry settings
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 60000; // 60 seconds

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function makeRequestWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${errorText}`);
    }
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    
    if (retries === 0) throw error;
    
    console.log(`Request failed, retrying... (${retries} attempts remaining)`);
    await sleep(delay);
    
    return makeRequestWithRetry(url, options, retries - 1, delay * 2);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    console.log('Request aborted due to timeout');
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

    const messages = [{
      role: 'system',
      content: `You are a construction cost estimator. Return ONLY a valid JSON object with no additional text. Format costs as numbers, not strings.

Example format:
{
  "groups": [
    {
      "name": "Material & Labor",
      "subgroups": [
        {
          "name": "Paint Materials",
          "items": [
            {
              "title": "Interior Paint",
              "description": "Premium quality interior paint",
              "quantity": 5,
              "unit": "gallons",
              "unitAmount": 45.99,
              "totalPrice": 229.95
            }
          ],
          "subtotal": 229.95
        }
      ]
    }
  ],
  "totalCost": 229.95,
  "ai_generated_title": "Interior Painting Project",
  "ai_generated_message": "Professional interior painting project including premium materials."
}`
    }];

    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: imageUrl
          },
          {
            type: 'text',
            text: 'Analyze this image and consider it when generating the estimate.'
          }
        ]
      });
    }

    messages.push({
      role: 'user',
      content: `Based on the following information, generate ONLY a JSON response:
      Category: ${category || 'General Construction'}
      Description: ${projectDescription || 'Project estimate'}
      Questions and Answers:
      ${formattedAnswers.map(cat => `
      Category: ${cat.category}
      ${cat.questions.map(q => `Q: ${q.question}\nA: ${q.answer}`).join('\n')}`).join('\n')}`
    });

    try {
      console.log('Making request to LLaMA API...');
      const response = await makeRequestWithRetry(
        'https://api.llama-api.com/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${llamaApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            model: "llama3.2-11b-vision",
            temperature: 0.2,
            stream: false,
            max_tokens: 800,
            response_format: { type: "json_object" }
          }),
          signal: controller.signal
        }
      );

      const data = await response.json();
      console.log('Received response from LLaMA API');

      let parsedEstimate;
      try {
        const content = data.choices?.[0]?.message?.content;
        
        if (typeof content !== 'string') {
          throw new Error('Invalid response format: content is not a string');
        }

        parsedEstimate = JSON.parse(content);
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
