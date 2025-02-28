
export const DEFAULT_CONTRACTOR_ID = "098bcb69-99c6-445b-bf02-94dc7ef8c938";

export interface EstimateRequest {
  leadId?: string;
  contractorId?: string;
  answers?: Record<string, any>;
  category?: string;
  projectDescription?: string;
  imageUrl?: string;
  projectImages?: string[];
  address?: string;
}
