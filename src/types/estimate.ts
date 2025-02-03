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

export interface QuestionAnswer {
  question: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice';
  answers: string[];
  options: {
    label: string;
    value: string;
    next?: string;
  }[];
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