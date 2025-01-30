export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  multi_choice: boolean;
  is_branching: boolean;
  sub_questions?: Question[];
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