
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
    
    // Validate and normalize the response structure
    const normalizedEstimate: EstimateData = {
      groups: [],
      totalCost: 0,
      ai_generated_title: category || "Construction Project",
      ai_generated_message: projectDescription || "Project estimate"
    };

    // If the response has the expected structure, use it
    if (parsedResponse.groups && Array.isArray(parsedResponse.groups)) {
      normalizedEstimate.groups = parsedResponse.groups.map(group => ({
        name: group.name || "Unnamed Group",
        subgroups: (group.subgroups || []).map(subgroup => ({
          name: subgroup.name || "Unnamed Subgroup",
          items: (subgroup.items || []).map(item => ({
            title: item.title || "Unnamed Item",
            description: item.description || "",
            quantity: typeof item.quantity === 'number' ? item.quantity : 1,
            unit: item.unit || "unit",
            unitAmount: typeof item.unitAmount === 'number' ? item.unitAmount : 0,
            totalPrice: typeof item.totalPrice === 'number' ? item.totalPrice : 0
          })),
          subtotal: typeof subgroup.subtotal === 'number' ? subgroup.subtotal : 
            (subgroup.items || []).reduce((sum, item) => sum + (item.totalPrice || 0), 0)
        }))
      }));

      // Calculate total cost
      normalizedEstimate.totalCost = normalizedEstimate.groups.reduce((total, group) => 
        total + group.subgroups.reduce((groupTotal, subgroup) => 
          groupTotal + subgroup.subtotal, 0), 0);
    }

    // If no valid groups were created, create a default group
    if (normalizedEstimate.groups.length === 0) {
      normalizedEstimate.groups = [
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
      ];
      normalizedEstimate.totalCost = 1000;
    }

    return normalizedEstimate;
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
