
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { generateEstimate, formatAnswersForContext } from "./ai-service.ts";
import { createEstimate, updateLeadWithEstimate, updateLeadWithError } from "./estimate-service.ts";
import type { EstimateRequest } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const controller = new AbortController();
  const { signal } = controller;

  try {
    console.log('Starting estimate generation process...');
    
    // Parse request data
    const requestData: EstimateRequest = await req.json();
    console.log('Received request data:', JSON.stringify(requestData, null, 2));

    // Setup Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate leadId
    if (!requestData.leadId) {
      throw new Error('leadId is required');
    }

    // Get contractor ID directly from request first
    let effectiveContractorId = requestData.contractorId;

    // If no contractor ID in request, try to get it from the lead
    if (!effectiveContractorId) {
      console.log('No contractor ID in request, checking lead...');
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('contractor_id')
        .eq('id', requestData.leadId)
        .maybeSingle();

      if (leadError) {
        console.error('Error fetching lead:', leadError);
        throw new Error('Failed to fetch lead data');
      }

      effectiveContractorId = lead?.contractor_id;
    }

    console.log('Using contractor ID:', effectiveContractorId);

    if (!effectiveContractorId) {
      throw new Error('No contractor ID found in lead or request');
    }

    // Get contractor data
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select(`
        *,
        contractor_settings(*),
        ai_instructions(*)
      `)
      .eq('id', effectiveContractorId)
      .maybeSingle();

    if (contractorError || !contractor) {
      console.error('Error fetching contractor:', contractorError);
      throw new Error('Failed to fetch contractor data');
    }

    // Get AI rates
    const { data: aiRates, error: ratesError } = await supabase
      .from('ai_rates')
      .select('*')
      .eq('contractor_id', effectiveContractorId)
      .eq('type', (requestData.category || '')?.toLowerCase() || '');

    if (ratesError) {
      console.error('Error fetching AI rates:', ratesError);
      // Continue without rates as they're optional
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('project_description, category')
      .eq('id', requestData.leadId)
      .maybeSingle();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      throw new Error('Failed to fetch lead data');
    }

    // Prepare context for AI
    const context = JSON.stringify({
      answers: formatAnswersForContext(requestData.answers || {}),
      projectDescription: requestData.projectDescription || lead?.project_description,
      category: requestData.category || lead?.category,
      aiRates: aiRates || [],
      contractor: {
        settings: contractor.contractor_settings,
        businessAddress: contractor.business_address,
        aiInstructions: contractor.ai_instructions
      }
    });

    // Get OpenAI key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Generate estimate
    console.log('Generating estimate with AI...');
    const aiResponse = await generateEstimate(
      context,
      requestData.imageUrl,
      openAIApiKey,
      signal
    );

    // Create estimate object
    console.log('Processing AI response...');
    const estimate = createEstimate(
      aiResponse,
      requestData.category || lead?.category,
      requestData.projectDescription || lead?.project_description
    );

    // Update lead with estimate
    console.log('Updating lead with estimate...');
    await updateLeadWithEstimate(
      requestData.leadId,
      estimate,
      supabaseUrl,
      supabaseKey
    );

    console.log('Estimate generation completed successfully');
    return new Response(
      JSON.stringify(estimate),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-estimate function:', error);
    
    // Try to update lead with error if possible
    try {
      const requestData: EstimateRequest = await req.json();
      if (requestData?.leadId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          await updateLeadWithError(
            requestData.leadId,
            error instanceof Error ? error.message : 'Unknown error',
            supabaseUrl,
            supabaseKey
          );
        }
      }
    } catch (updateError) {
      console.error('Failed to update lead with error:', updateError);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } finally {
    controller.abort();
  }
});
