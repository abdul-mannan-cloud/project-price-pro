
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EstimateItem {
  title: string;
  quantity: number;
  variable: string;
  description: string;
  amount: number;
  unitAmount: number;
  totalPrice: number;
}

interface AIRate {
  type: string;
  rate: number;
  unit: string;
  title: string;
}

interface AIInstruction {
  title: string;
  instructions: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectDescription, imageUrl, answers, contractorId, leadId, category } = await req.json();
    
    // Get contractor settings including AI rates and instructions
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch contractor settings including the new ai_rates and ai_instructions
    const { data: settings, error: settingsError } = await supabase
      .from('contractor_settings')
      .select('ai_rates, ai_instructions')
      .eq('id', contractorId)
      .single();

    if (settingsError) {
      throw new Error('Error fetching contractor settings');
    }

    const aiRates: AIRate[] = settings?.ai_rates || [];
    const aiInstructions: AIInstruction[] = settings?.ai_instructions || [];

    // Generate estimate using AI
    const estimateData = await generateEstimate({
      projectDescription,
      imageUrl,
      answers,
      contractorId,
      leadId,
      category,
      aiRates,
      aiInstructions
    });

    // Save estimate to the database
    const { data: savedEstimate, error: saveError } = await supabase
      .from('estimates')
      .insert([{ 
        ...estimateData, 
        contractor_id: contractorId, 
        lead_id: leadId,
        status: 'active'
      }])
      .select()
      .single();

    if (saveError) throw saveError;

    // Format the response to match the EstimateDisplay expected structure
    const formattedEstimate = {
      groups: [{
        name: category || 'Project Estimate',
        description: projectDescription,
        subgroups: [{
          name: 'Materials & Labor',
          items: estimateData.items.map((item: EstimateItem) => ({
            title: item.title,
            description: item.description,
            quantity: item.quantity,
            unit: item.variable,
            unitAmount: item.unitAmount,
            totalPrice: item.amount
          })),
          subtotal: estimateData.items.reduce((sum: number, item: EstimateItem) => sum + item.amount, 0)
        }]
      }],
      totalCost: estimateData.items.reduce((sum: number, item: EstimateItem) => sum + item.amount, 0),
      ai_generated_title: `${category || 'Project'} Estimate - ${new Date().toLocaleDateString()}`,
      ai_generated_message: projectDescription || 'Custom project estimate based on your requirements.'
    };

    console.log('Generated estimate:', formattedEstimate);

    return new Response(
      JSON.stringify(formattedEstimate),
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

const generateEstimate = async ({ 
  projectDescription, 
  imageUrl, 
  answers, 
  contractorId, 
  leadId, 
  category,
  aiRates,
  aiInstructions 
}: {
  projectDescription: string;
  imageUrl?: string;
  answers: any[];
  contractorId: string;
  leadId: string;
  category?: string;
  aiRates: AIRate[];
  aiInstructions: AIInstruction[];
}) => {
  console.log('Processing answers:', answers);
  
  const estimateItems = answers.map(answer => {
    // Determine the type based on the answer content
    const type = answer.labor && answer.material 
      ? 'material_labor'
      : answer.labor 
        ? 'labor' 
        : 'material';

    const variable = answer.variable || 'EA'; // Default to Each if no variable specified
    const description = answer.material 
      ? "Material + Labor" 
      : answer.labor 
        ? "Labor" 
        : "Material";
    const title = `${answer.item || answer.question} (${variable})`;

    // Find applicable rate from the contractor's AI rates
    const rate = aiRates.find(r => r.type === type && r.unit === variable) || 
                aiRates.find(r => r.type === type) || // Fallback to matching just the type
                { rate: 100, unit: 'EA', type: 'material_labor', title: 'Default Rate' };

    const quantity = answer.quantity || 1;
    const unitAmount = rate.rate;
    const amount = unitAmount * quantity;

    return {
      title,
      quantity,
      variable,
      description,
      amount,
      unitAmount,
      totalPrice: amount
    };
  });

  return {
    items: estimateItems,
    totalCost: estimateItems.reduce((sum, item) => sum + item.amount, 0)
  };
};
