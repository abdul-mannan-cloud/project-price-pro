export interface Option {
  label: string;
  value: string;
  next?: string;
  image_url?: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice';
  order: number;
  options: Option[];
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
  icon?: string;
}

export interface EstimateFormState {
  currentQuestionId: string | null;
  answers: Record<string, string[]>;
  isComplete: boolean;
}

export interface QuestionBranch {
  category: string;
  questions: Question[];
  currentQuestionId: string | null;
  isComplete: boolean;
}

export interface QuestionFlow {
  branches: QuestionBranch[];
  currentBranchIndex: number;
  answers: Record<string, Record<string, string[]>>;
}