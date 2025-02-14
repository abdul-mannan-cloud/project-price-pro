
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

export const createEstimate = (
  aiResponse: string,
  category?: string,
  projectDescription?: string
) => {
  try {
    const parsedResponse = JSON.parse(aiResponse);
    return {
      ...parsedResponse,
      category,
      projectDescription
    };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new Error('Failed to parse AI response');
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
