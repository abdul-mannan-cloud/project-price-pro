
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export const createEstimate = (
  aiResponse: string,
  category?: string,
  projectDescription?: string
) => {
  try {
    console.log('Parsing AI response in createEstimate:', aiResponse);
    
    // Ensure we're working with a string
    const responseString = typeof aiResponse === 'object' ? JSON.stringify(aiResponse) : aiResponse;
    
    // Parse the response
    const parsedResponse = JSON.parse(responseString);
    
    // Validate required fields
    if (!parsedResponse.groups || !Array.isArray(parsedResponse.groups)) {
      throw new Error('Invalid estimate format: missing or invalid groups array');
    }
    
    if (typeof parsedResponse.totalCost !== 'number') {
      throw new Error('Invalid estimate format: missing or invalid totalCost');
    }

    // Validate each group and its subgroups
    parsedResponse.groups.forEach((group: any, groupIndex: number) => {
      if (!group.name || !group.subgroups || !Array.isArray(group.subgroups)) {
        throw new Error(`Invalid group format at index ${groupIndex}`);
      }

      group.subgroups.forEach((subgroup: any, subgroupIndex: number) => {
        if (!subgroup.name || !subgroup.items || !Array.isArray(subgroup.items)) {
          throw new Error(`Invalid subgroup format at group ${groupIndex}, subgroup ${subgroupIndex}`);
        }

        subgroup.items.forEach((item: any, itemIndex: number) => {
          if (!item.title || typeof item.quantity !== 'number' || typeof item.unitAmount !== 'number') {
            throw new Error(`Invalid item format at group ${groupIndex}, subgroup ${subgroupIndex}, item ${itemIndex}`);
          }
        });
      });
    });

    return {
      ...parsedResponse,
      category,
      projectDescription
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    console.error('Raw AI response:', aiResponse);
    console.error('AI response type:', typeof aiResponse);
    throw new Error('Failed to parse AI response: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
};

export const updateLeadWithEstimate = async (
  leadId: string,
  estimate: any,
  supabaseUrl: string,
  supabaseKey: string
) => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { error } = await supabase
    .from('leads')
    .update({
      estimate_data: estimate,
      status: 'complete',
      error_message: null,
      error_timestamp: null
    })
    .eq('id', leadId);

  if (error) {
    console.error('Error updating lead with estimate:', error);
    throw error;
  }
};

export const updateLeadWithError = async (
  leadId: string,
  errorMessage: string,
  supabaseUrl: string,
  supabaseKey: string
) => {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { error } = await supabase
    .from('leads')
    .update({
      status: 'error',
      error_message: errorMessage,
      error_timestamp: new Date().toISOString()
    })
    .eq('id', leadId);

  if (error) {
    console.error('Error updating lead with error status:', error);
    throw error;
  }
};
