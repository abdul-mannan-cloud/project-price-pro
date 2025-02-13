import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { EstimateData } from "./types.ts";

export function createEstimate(
  aiResponse: string,
  category: string | undefined,
  projectDescription: string | undefined
): EstimateData {
  try {
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse.trim());
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid JSON response');
    }
    
    // Transform the flat line items structure into the grouped structure expected by the frontend
    const groupedEstimate: EstimateData = {
      groups: [],
      totalCost: parsedResponse.totalCost || 0,
      ai_generated_title: category || "Construction Project",
      ai_generated_message: projectDescription || "Project estimate"
    };

    // Group line items by their group property
    const groupedItems = parsedResponse.lineItems.reduce((acc: any, item: any) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    }, {});

    // Transform into the required structure
    groupedEstimate.groups = Object.entries(groupedItems).map(([groupName, items]: [string, any[]]) => ({
      name: groupName,
      subgroups: [{
        name: 'Items',
        items: items.map(item => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unit: 'unit', // Default unit since it's not in the simplified structure
          unitAmount: item.unitPrice,
          totalPrice: item.total
        })),
        subtotal: items.reduce((sum, item) => sum + (item.total || 0), 0)
      }]
    }));

    return groupedEstimate;
  } catch (error) {
    console.error('Error creating estimate:', error);
    // Return a basic fallback estimate
    return {
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
      totalCost: 1000,
      ai_generated_title: category || "Construction Project",
      ai_generated_message: projectDescription || "Project estimate"
    };
  }
}

export async function updateLeadWithEstimate(
  leadId: string,
  estimate: EstimateData,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

  try {
    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update({ 
        estimate_data: estimate,
        status: 'complete',
        estimated_cost: estimate.totalCost,
        ai_generated_title: estimate.ai_generated_title,
        ai_generated_message: estimate.ai_generated_message,
        error_message: null,
        error_timestamp: null
      })
      .eq('id', leadId);

    if (updateError) {
      console.error('Error updating lead with estimate:', updateError);
      throw updateError;
    }
  } catch (error) {
    console.error('Failed to update lead with estimate:', error);
    throw error;
  }
}

export async function updateLeadWithError(
  leadId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  
  try {
    const timestamp = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('leads')
      .update({ 
        status: 'error',
        error_message: errorMessage,
        error_timestamp: timestamp
      })
      .eq('id', leadId);

    if (error) {
      console.error('Failed to update lead with error status:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to update lead with error:', error);
    throw error;
  }
}
