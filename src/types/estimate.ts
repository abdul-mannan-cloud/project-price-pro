export interface QuestionOption {
  id?: string;
  label: string;
  value?: string;
}

export interface Question {
  id?: string;
  order: number;
  question: string;
  selections?: string[];
  options?: QuestionOption[];
  multi_choice: boolean;
  next_question?: number | null;
  next_if_no?: number | null;
  is_branching?: boolean;
  sub_questions?: Record<string, Question[]>;
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