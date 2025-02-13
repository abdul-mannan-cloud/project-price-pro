
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { generateLlamaResponse, formatAnswersForContext } from "./llama-api.ts"
import { createEstimate, updateLeadWithEstimate, updateLeadWithError } from "./estimate-service.ts"
import { EstimateRequest, EstimateResponse } from "./types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TIMEOUT = 30000; // Increased timeout to 30 seconds

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

    // Try both formats of the API key name
    let llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      llamaApiKey = Deno.env.get('llama v2');
    }
    
    if (!llamaApiKey) {
      console.error('Missing LLaMA API key in environment variables');
      throw new Error('Missing LLaMA API key. Please ensure LLAMA_API_KEY is set in your environment variables.');
    }

    console.log('API key found:', llamaApiKey ? 'Yes' : 'No');

    const requestData: EstimateRequest = await req.json();
    console.log('Request data:', requestData);

    const { answers, projectDescription, category, leadId, imageUrl } = requestData;

    if (!leadId) {
      throw new Error('Missing leadId');
    }

    const formattedAnswers = formatAnswersForContext(answers);
    
    const context = `Project: ${category || 'General Construction'}
    ${projectDescription || 'Project estimate'}
    ${formattedAnswers.map(cat => 
      `${cat.category}: ${cat.questions.map(q => `${q.question} - ${q.answer}`).join('; ')}`
    ).join('\n')}`;

    console.log('Prepared context:', context);

    try {
      // Create a basic default estimate in case of failure
      const defaultEstimate = {
        groups: [
          {
            name: "Labor and Materials",
            subgroups: [
              {
                name: category || "General Work",
                items: [
                  {
                    title: "General Labor",
                    description: projectDescription || "Construction work",
                    quantity: 1,
                    unit: "job",
                    unitAmount: 1000,
                    totalPrice: 1000
                  }
                ],
                subtotal: 1000
              }
            ]
          }
        ],
        totalCost: 1000
      };

      let aiResponse;
      try {
        aiResponse = await generateLlamaResponse(
          context,
          imageUrl,
          llamaApiKey,
          controller.signal
        );
      } catch (llmError) {
        console.error('LLM API error:', llmError);
        console.log('Falling back to default estimate');
        aiResponse = JSON.stringify(defaultEstimate);
      }

      console.log('AI Response:', aiResponse);

      const estimate = createEstimate(aiResponse, category, projectDescription);

      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials');
      }

      await updateLeadWithEstimate(leadId, estimate, supabaseUrl, supabaseKey);

      const response: EstimateResponse = {
        message: "Estimate generated successfully",
        leadId
      };

      return new Response(JSON.stringify(response), { 
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
        await updateLeadWithError(
          leadId,
          error.message || 'Failed to generate estimate',
          supabaseUrl,
          supabaseKey
        );
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error in edge function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate estimate',
        details: error.message,
        stack: error.stack
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
