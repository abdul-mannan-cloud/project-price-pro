
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const controller = new AbortController();
  const { signal } = controller;

  try {
    console.log('Starting estimate generation process...');
    
    const requestData: EstimateRequest = await req.json();
    console.log('Received request data:', JSON.stringify(requestData, null, 2));

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!requestData.leadId) {
      throw new Error('leadId is required');
    }

    // Get lead data first to find contractor_id if not provided
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('contractor_id, project_description, category')
      .eq('id', requestData.leadId)
      .maybeSingle();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      throw new Error('Could not fetch lead data');
    }

    if (!lead) {
      console.error('No lead found with id:', requestData.leadId);
      throw new Error('Lead not found');
    }

    console.log('Found lead:', JSON.stringify(lead, null, 2));

    // Use provided contractorId or fall back to the one stored on the lead
    const contractorId = requestData.contractorId || lead.contractor_id;
    
    console.log('Resolved contractor ID:', {
      fromRequest: requestData.contractorId,
      fromLead: lead.contractor_id,
      final: contractorId
    });

    if (!contractorId) {
      console.error('No contractor ID found in request or lead:', {
        requestData,
        lead
      });
      throw new Error('No contractor ID available from request or lead data');
    }

    // Get contractor data
    const { data: contractor, error: contractorError } = await supabase
      .from('contractors')
      .select(`
        *,
        contractor_settings(*),
        ai_instructions(*)
      `)
      .eq('id', contractorId)
      .maybeSingle();

    if (contractorError) {
      console.error('Error fetching contractor:', contractorError);
      throw new Error('Failed to fetch contractor data');
    }

    if (!contractor) {
      console.error('No contractor found with id:', contractorId);
      throw new Error('Contractor not found');
    }

    // Get AI rates
    const { data: aiRates, error: ratesError } = await supabase
      .from('ai_rates')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('type', (requestData.category || lead.category || '')?.toLowerCase() || '');

    if (ratesError) {
      console.error('Error fetching AI rates:', ratesError);
      // Continue without rates as they're optional
    }

    // Prepare context for AI
    const context = JSON.stringify({
      answers: formatAnswersForContext(requestData.answers || {}),
      projectDescription: requestData.projectDescription || lead.project_description,
      category: requestData.category || lead.category,
      aiRates: aiRates || [],
      contractor: {
        settings: contractor.contractor_settings,
        businessAddress: contractor.business_address,
        aiInstructions: contractor.ai_instructions
      }
    });

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating estimate with AI...');
    const aiResponse = await generateEstimate(
      context,
      requestData.imageUrl,
      openAIApiKey,
      signal
    );

    console.log('Processing AI response...');
    const estimate = createEstimate(
      aiResponse,
      requestData.category || lead.category,
      requestData.projectDescription || lead.project_description
    );

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
