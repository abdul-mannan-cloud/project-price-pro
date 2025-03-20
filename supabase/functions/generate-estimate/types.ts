
export const DEFAULT_CONTRACTOR_ID = "82499c2f-960f-4042-b277-f86ea2d99929";

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
