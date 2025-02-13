
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { EstimateData } from "./types.ts";

export function createEstimate(
  aiResponse: string,
  category: string | undefined,
  projectDescription: string | undefined
): EstimateData {
  let parsedResponse;
  try {
    parsedResponse = JSON.parse(aiResponse.trim());
    
    // Validate response structure
    if (!parsedResponse.groups || !Array.isArray(parsedResponse.groups)) {
      throw new Error('Invalid response structure');
    }

    // Calculate total cost from groups
    let totalCost = 0;
    parsedResponse.groups.forEach((group: any) => {
      if (group.subgroups && Array.isArray(group.subgroups)) {
        group.subgroups.forEach((subgroup: any) => {
          if (typeof subgroup.subtotal === 'number') {
            totalCost += subgroup.subtotal;
          }
        });
      }
    });

    // If total cost wasn't properly calculated, use the one from response or set to 0
    if (totalCost === 0 && typeof parsedResponse.totalCost === 'number') {
      totalCost = parsedResponse.totalCost;
    }

    return {
      groups: parsedResponse.groups,
      totalCost,
      ai_generated_title: category || "Construction Project",
      ai_generated_message: projectDescription || "Project estimate"
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    // Return a basic estimate structure if parsing fails
    return {
      groups: [
        {
          name: "Project Estimate",
          subgroups: [
            {
              name: "Total",
              items: [
                {
                  title: category || "Construction Work",
                  description: projectDescription || "Project work",
                  quantity: 1,
                  unit: "project",
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

  const { error: updateError } = await supabaseAdmin
    .from('leads')
    .update({ 
      estimate_data: estimate,
      status: 'complete',
      estimated_cost: estimate.totalCost,
      ai_generated_title: estimate.ai_generated_title,
      ai_generated_message: estimate.ai_generated_message
    })
    .eq('id', leadId);

  if (updateError) {
    throw updateError;
  }
}

export async function updateLeadWithError(
  leadId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<void> {
  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  
  const { error } = await supabaseAdmin
    .from('leads')
    .update({ 
      status: 'error',
      error_message: errorMessage
    })
    .eq('id', leadId);

  if (error) {
    console.error('Failed to update lead with error status:', error);
  }
}
