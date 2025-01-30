export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: string;
  question: string;
  multi_choice: boolean;
  is_branching: boolean;
  options: QuestionOption[];
  sub_questions?: Question[];  // Changed from SubQuestion[] to Question[]
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