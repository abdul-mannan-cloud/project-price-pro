
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { generateEstimate, formatAnswersForContext } from "./ai-service.ts";
import { createEstimate, updateLeadWithEstimate, updateLeadWithError } from "./estimate-service.ts";
import type { EstimateRequest } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const controller = new AbortController();
  const { signal } = controller;
  let requestData: EstimateRequest | null = null;

  try {
    console.log('Received request to generate estimate');
    
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request:', parseError);
      throw new Error('Invalid request format');
    }

    if (!requestData) {
      throw new Error('No request data provided');
    }

    const { answers, projectDescription, leadId, category, imageUrl, contractorId } = requestData;

    if (!leadId) {
      throw new Error('leadId is required');
    }

    console.log('Request data:', {
      hasAnswers: !!answers,
      hasProjectDescription: !!projectDescription,
      leadId,
      category,
      hasImageUrl: !!imageUrl,
      contractorId
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, try to use the contractorId from the request
    let effectiveContractorId = contractorId;

    // If no contractorId in request, get it from the lead
    if (!effectiveContractorId) {
      console.log('No contractor ID in request, fetching from lead:', leadId);
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('contractor_id')
        .eq('id', leadId)
        .maybeSingle();

      if (leadError) {
        console.error('Error fetching lead:', leadError);
        throw new Error(`Failed to fetch lead: ${leadError.message}`);
      }

      effectiveContractorId = lead?.contractor_id;
      console.log('Found contractor ID in lead:', effectiveContractorId);
    }

    // Verify we have a valid contractor ID
    if (!effectiveContractorId) {
      throw new Error('No contractor ID found. Please ensure either the lead has a contractor_id or provide it in the request.');
    }

    // Get contractor settings and AI instructions
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select(`
        *,
        contractor_settings(*),
        ai_instructions(*)
      `)
      .eq('id', effectiveContractorId)
      .single();

    if (contractorError) {
      console.error('Error fetching contractor:', contractorError);
      throw new Error(`Failed to fetch contractor: ${contractorError.message}`);
    }

    if (!contractor) {
      throw new Error(`Contractor not found with ID: ${effectiveContractorId}`);
    }

    // Get AI rates for the category
    const { data: aiRates, error: ratesError } = await supabase
      .from('ai_rates')
      .select('*')
      .eq('contractor_id', effectiveContractorId)
      .eq('type', category?.toLowerCase() || '');

    if (ratesError) {
      console.error('Error fetching AI rates:', ratesError);
      throw new Error(`Failed to fetch AI rates: ${ratesError.message}`);
    }

    // Format the context for OpenAI
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

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    console.log('Generating estimate with AI...');

    // Generate estimate using OpenAI
    const aiResponse = await generateEstimate(
      context,
      imageUrl,
      openAIApiKey,
      signal
    );

    console.log('AI response received, creating estimate...');

    // Create and process the estimate
    const estimate = createEstimate(aiResponse, category, projectDescription);

    console.log('Updating lead with estimate...');

    // Update the lead with the estimate
    await updateLeadWithEstimate(
      leadId,
      estimate,
      supabaseUrl,
      supabaseKey
    );

    console.log('Estimate generation complete');

    return new Response(
      JSON.stringify(estimate),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in generate-estimate function:', error);
    
    // Only try to update the lead with error if we have the leadId
    if (requestData?.leadId) {
      try {
        await updateLeadWithError(
          requestData.leadId,
          error instanceof Error ? error.message : 'An unexpected error occurred',
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
      } catch (updateError) {
        console.error('Failed to update lead with error:', updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: error instanceof Error ? error.stack : undefined
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
    controller.abort();
  }
});
