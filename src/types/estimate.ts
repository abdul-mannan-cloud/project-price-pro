export interface Option {
  unit?: string;
  label: string;
  value: string;
  type?: 'text_input' | 'number_input' | 'camera_measurement';
  tooltip?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  camera_prompt?: string;
  validation?: string;
  validation_message?: string;
  character_limit?: string;
  next?: string;
  image_url?: string;
  description?: string;
}
export interface Question {
  id: string;
  question: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice' | 'measurement_input' | 'text_input' | 'image_input' | 'camera_measurement';
  order: number;
  options: Option[];
  next?: string;

  // New properties for measurement_input type
  unit?: string; // e.g., "LF" (linear feet), "SF" (square feet)
  placeholder?: string;
  min?: number;
  max?: number;
  validation?: string; // regex pattern for validation
  validation_message?: string;
  camera_option?: boolean;
  camera_prompt?: string;
  helper_text?: string;
  tooltip?: string;
  video_guide?: string;

}

export interface QuestionAnswer {
  question: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice' | 'measurement_input' | 'text_input' | 'image_input';
  answers: string[];
  options: {
    label: string;
    value: string;
    next?: string;
  }[];
  // For measurement inputs, additional response data
  unit?: string;
  measurement_method?: 'manual' | 'camera';
}

export interface CategoryAnswers {
  [questionId: string]: QuestionAnswer;
}

export interface AnswersState {
  [category: string]: CategoryAnswers;
}

export interface CategoryQuestions {
  category: string;
  keywords: string[];
  questions: Question[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  questions?: Question[];
  keywords: string[];
}

export interface EstimateFormState {
  currentQuestionId: string | null;
  answers: AnswersState;
  isComplete: boolean;
}

export interface EstimateConfig {
  contractorId: string;
  isPreview?: boolean;
  allowSignature?: boolean;
  showSubtotals?: boolean;
}

export interface EstimateResponse {
  estimate: any;
  leadId: string;
  contractorId: string;
  status: 'pending' | 'complete' | 'error';
  error?: string;
}

// Helper type for matching categories with questions
export interface CategoryWithQuestions extends Category {
  questions: Question[];
}

// Helper function to check if a category has questions
export function isCategoryWithQuestions(category: Category): category is CategoryWithQuestions {
  return Array.isArray(category.questions) && category.questions.length > 0;
}

// Helper function to convert Category to CategoryQuestions
export function categoryToQuestionSet(category: CategoryWithQuestions): CategoryQuestions {
  return {
    category: category.id,
    keywords: category.keywords,
    questions: category.questions
  };
}

