export interface QuestionOption {
  id: string;
  label: string;
  value?: string;
}

export interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  multi_choice: boolean;
  is_branching: boolean;
  sub_questions?: {
    [key: string]: Question[];
  };
}

export interface BranchingLogic {
  [questionId: string]: {
    [optionId: string]: string[];
  };
}

export interface CategoryQuestions {
  questions: Question[];
  branching_logic: BranchingLogic;
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