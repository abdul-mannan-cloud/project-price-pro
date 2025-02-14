
export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface CategoryAnswers {
  category: string;
  questions: QuestionAnswer[];
}

export interface EstimateRequest {
  answers: Record<string, any>;
  projectDescription?: string;
  category?: string;
  leadId: string;
  imageUrl?: string;
  contractorId?: string; // Added this field
}

export interface EstimateResponse {
  message: string;
  leadId: string;
}

export interface EstimateData {
  groups: Array<{
    name: string;
    subgroups: Array<{
      name: string;
      items: Array<{
        title: string;
        description?: string;
        quantity: number;
        unit: string;
        unitAmount: number;
        totalPrice: number;
      }>;
      subtotal: number;
    }>;
  }>;
  totalCost: number;
  ai_generated_title: string;
  ai_generated_message: string;
}
