
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

const TIMEOUT = 25000;

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
      const aiResponse = await generateLlamaResponse(
        context,
        imageUrl,
        llamaApiKey,
        controller.signal
      );

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
