
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { answers, projectDescription, leadId, category } = await req.json();

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
      .eq('type', category.toLowerCase());

    if (ratesError) throw ratesError;

    // Construct the prompt
    const systemPrompt = `You are an advanced contractor estimate generator. Generate a detailed project estimate in JSON format using the following rules:
    - Use contractor's minimum project cost: ${contractor.contractor_settings.minimum_project_cost}
    - Apply markup percentage: ${contractor.contractor_settings.markup_percentage}%
    - Apply tax rate: ${contractor.contractor_settings.tax_rate}%
    ${contractor.ai_instructions?.map(instruction => `- ${instruction.instructions}`).join('\n')}`;

    // Make request to LLaMA API
    const llamaApiKey = Deno.env.get('LLAMA_API_KEY');
    const response = await fetch('https://api.llama-api.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${llamaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-2-70b-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user',
            content: JSON.stringify({
              answers,
              projectDescription,
              category,
              aiRates,
              contractor: {
                settings: contractor.contractor_settings,
                businessAddress: contractor.business_address
              }
            })
          }
        ],
        ...contractor.contractor_settings.ai_model_settings
      }),
    });

    const result = await response.json();

    // Update the lead with the estimate
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        estimate_data: JSON.parse(result.choices[0].message.content),
        status: 'completed'
      })
      .eq('id', leadId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify(result.choices[0].message.content),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
