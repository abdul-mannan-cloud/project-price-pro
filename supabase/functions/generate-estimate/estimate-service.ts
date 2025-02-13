
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
    
    // Transform into the expected grouped structure
    const groupedEstimate: EstimateData = {
      groups: [{
        name: category || "Construction Work",
        description: projectDescription,
        subgroups: []
      }],
      totalCost: 0,
      ai_generated_title: category ? `${category} Project Estimate` : "Construction Project Estimate",
      ai_generated_message: projectDescription || "Detailed project estimate breakdown"
    };

    // Group items by their categories
    const categories = new Map<string, Array<any>>();
    
    // First pass: organize items by category
    parsedResponse.lineItems?.forEach((item: any) => {
      const category = item.category || "General";
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)?.push({
        title: item.title,
        description: item.description,
        quantity: item.quantity || 1,
        unit: item.unit || "unit",
        unitAmount: item.unitPrice || item.price || 0,
        totalPrice: item.total || (item.quantity || 1) * (item.unitPrice || item.price || 0)
      });
    });

    // Second pass: create subgroups
    groupedEstimate.groups[0].subgroups = Array.from(categories.entries()).map(([name, items]) => ({
      name,
      items,
      subtotal: items.reduce((sum, item) => sum + item.totalPrice, 0)
    }));

    // Calculate total cost
    groupedEstimate.totalCost = groupedEstimate.groups[0].subgroups.reduce(
      (sum, subgroup) => sum + subgroup.subtotal, 
      0
    );

    if (groupedEstimate.totalCost === 0) {
      throw new Error('Invalid estimate total');
    }

    return groupedEstimate;
  } catch (error) {
    console.error('Error creating estimate:', error);
    // Return a basic fallback estimate
    return {
      groups: [
        {
          name: category || "Construction Work",
          description: projectDescription || "Project estimate",
          subgroups: [
            {
              name: "General Work",
              items: [
                {
                  title: "Labor and Materials",
                  description: "General construction work",
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
      ai_generated_title: category ? `${category} Project Estimate` : "Construction Project Estimate",
      ai_generated_message: projectDescription || "Project estimate details"
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
