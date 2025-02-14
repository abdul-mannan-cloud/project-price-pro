
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const controller = new AbortController();
  const { signal } = controller;

  try {
    console.log('Received request to generate estimate');
    
    let requestData: EstimateRequest;
    try {
      requestData = await req.json();
      console.log('Received request data:', requestData);
    } catch (parseError) {
      console.error('Error parsing request:', parseError);
      throw new Error('Invalid request format');
    }

    // First, let's validate the essential parameters
    if (!requestData.leadId) {
      throw new Error('leadId is required');
    }

    // Initialize Supabase client early to handle database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('contractor_id, project_description, category')
      .eq('id', requestData.leadId)
      .maybeSingle();

    if (leadError) {
      console.error('Error fetching lead:', leadError);
      throw new Error('Failed to fetch lead information');
    }

    // Use contractor ID from request or from lead
    let contractorId = requestData.contractorId || lead?.contractor_id;

    // Clean up contractor ID if it's malformed
    if (contractorId) {
      try {
        contractorId = decodeURIComponent(contractorId).replace(/[:?]/g, '').trim();
      } catch (e) {
        console.error('Error decoding contractor ID:', e);
      }
    }

    if (!contractorId) {
      console.error('No contractor ID found in either request or lead:', {
        requestContractorId: requestData.contractorId,
        leadContractorId: lead?.contractor_id,
        leadId: requestData.leadId
      });
      throw new Error('No contractor ID found. Please ensure either the lead has a contractor_id or provide it in the request.');
    }

    console.log('Using contractor ID:', contractorId);

    // Get contractor settings and AI instructions
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
      throw new Error(`Failed to fetch contractor: ${contractorError.message}`);
    }

    if (!contractor) {
      throw new Error(`Contractor not found with ID: ${contractorId}`);
    }

    // Get AI rates for the category
    const { data: aiRates, error: ratesError } = await supabase
      .from('ai_rates')
      .select('*')
      .eq('contractor_id', contractorId)
      .eq('type', (requestData.category || lead?.category)?.toLowerCase() || '');

    if (ratesError) {
      console.error('Error fetching AI rates:', ratesError);
      throw new Error(`Failed to fetch AI rates: ${ratesError.message}`);
    }

    // Format the context for OpenAI
    const context = JSON.stringify({
      answers: formatAnswersForContext(requestData.answers || {}),
      projectDescription: requestData.projectDescription || lead?.project_description,
      category: requestData.category || lead?.category,
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
      requestData.imageUrl,
      openAIApiKey,
      signal
    );

    console.log('AI response received, creating estimate...');

    // Create and process the estimate
    const estimate = createEstimate(aiResponse, requestData.category || lead?.category, requestData.projectDescription || lead?.project_description);

    console.log('Updating lead with estimate...');

    // Update the lead with the estimate
    await updateLeadWithEstimate(
      requestData.leadId,
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
    
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const errorDetails = error instanceof Error ? error.stack : undefined;
    
    try {
      // Try to update the lead with error if we have leadId
      if (requestData?.leadId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseKey) {
          await updateLeadWithError(
            requestData.leadId,
            errorMessage,
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
        error: errorMessage,
        details: errorDetails
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
