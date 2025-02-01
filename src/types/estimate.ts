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
  keywords?: string[];
  questions: Question[];
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  totalPrice: number;
}

export interface EstimateGroup {
  name: string;
  description?: string;
  items: LineItem[];
}

export interface EstimateData {
  groups: EstimateGroup[];
  totalCost: number;
  notes?: string[];
}

export interface OptionsData {
  [key: string]: {
    category: string;
    keywords: string[];
    questions: Question[];
  } | null;
}