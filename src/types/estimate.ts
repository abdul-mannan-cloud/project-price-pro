export interface QuestionOption {
  id?: string;
  label: string;
  value?: string;
}

export interface Question {
  id?: string;
  order?: number;
  question: string;
  selections?: string[];
  options?: QuestionOption[];
  multi_choice: boolean;
  next_question?: number;
  next_if_no?: number;
  is_branching?: boolean;
}

export interface CategoryQuestions {
  category: string;
  keywords?: string[];
  questions: Question[];
  branching_logic?: BranchingLogic;
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