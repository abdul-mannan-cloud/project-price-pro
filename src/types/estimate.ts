export interface QuestionOption {
  id: string;
  label: string;
}

export interface SubQuestion {
  id: string;
  question: string;
  multi_choice: boolean;
  options: QuestionOption[];
}

export interface Question {
  id: string;
  question: string;
  multi_choice: boolean;
  is_branching: boolean;
  options: QuestionOption[];
  sub_questions?: SubQuestion[];
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