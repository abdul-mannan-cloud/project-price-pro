
export interface EstimateRequest {
  leadId?: string;
  contractorId?: string;
  answers?: Record<string, any>;
  category?: string;
  projectDescription?: string;
  imageUrl?: string;
  projectImages?: string[];
}

export interface ContractorSettings {
  estimate_template_style?: string;
  ai_preferences?: {
    rate?: string;
    type?: string;
    instructions?: string;
  };
  minimum_project_cost?: number;
  markup_percentage?: number;
  tax_rate?: number;
}

export interface AIInstruction {
  id: string;
  title: string;
  instructions: string;
  system_prompt?: string;
}

export interface Contractor {
  id: string;
  business_name: string;
  business_address?: string;
  contractor_settings?: ContractorSettings;
  ai_instructions?: AIInstruction[];
}
