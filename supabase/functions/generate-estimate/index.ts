
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { generateLlamaResponse, formatAnswersForContext } from "./llama-api.ts";
import { createEstimate, updateLeadWithEstimate, updateLeadWithError } from "./estimate-service.ts";
import type { EstimateRequest } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const controller = new AbortController();
  const { signal } = controller;

  try {
    const requestData: EstimateRequest = await req.json();
    const { answers, projectDescription, leadId, category, imageUrl } = requestData;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead details to get contractor_id
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('contractor_id')
      .eq('id', leadId)
      .single();

    if (leadError) throw leadError;

    // Get contractor settings and AI instructions
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select(`
        *,
        contractor_settings(*),
        ai_instructions(*)
      `)
      .eq('id', lead.contractor_id)
      .single();

    if (contractorError) throw contractorError;

    // Get AI rates for the category
    const { data: aiRates, error: ratesError } = await supabase
      .from('ai_rates')
      .select('*')
      .eq('contractor_id', lead.contractor_id)
      .eq('type', category?.toLowerCase() || '');

    if (ratesError) throw ratesError;

    // Format the context for LLaMA
    const context = JSON.stringify({
      answers: formatAnswersForContext(answers),
      projectDescription,
      category,
      aiRates,
      contractor: {
        settings: contractor.contractor_settings,
        businessAddress: contractor.business_address,
        aiInstructions: contractor.ai_instructions
      }
    });

    // Generate estimate using LLaMA
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    if (!llamaApiKey) {
      throw new Error('LLAMA_API_KEY is not set');
    }

    const aiResponse = await generateLlamaResponse(
      context,
      imageUrl,
      llamaApiKey,
      signal
    );

    // Create and process the estimate
    const estimate = createEstimate(aiResponse, category, projectDescription);

    // Update the lead with the estimate
    await updateLeadWithEstimate(
      leadId,
      estimate,
      supabaseUrl,
      supabaseKey
    );

    return new Response(
      JSON.stringify(estimate),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    if (leadId) {
      try {
        await updateLeadWithError(
          leadId,
          error.message,
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
      } catch (updateError) {
        console.error('Failed to update lead with error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } finally {
    controller.abort();
  }
});
