export interface QuestionOption {
  label: string;
  value: string;
  next?: string;
  image_url?: string;
}

export interface Question {
  id: string;
  order: number;
  question: string;
  description?: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice';
  options: QuestionOption[];
  next?: string;
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
}

export interface EstimateFormState {
  currentQuestionId: string | null;
  answers: Record<string, string[]>;
  isComplete: boolean;
}