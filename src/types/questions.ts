export interface QuestionOption {
  label: string;
  value: string;
}

export interface SubQuestion {
  id?: string;
  question: string;
  selections: (string | QuestionOption)[];
  multi_choice: boolean;
  is_branching?: boolean;
  sub_questions?: Record<string, SubQuestion[]>;
}

export interface CategoryQuestion {
  id?: string;
  question: string;
  selections: (string | QuestionOption)[];
  is_branching: boolean;
  multi_choice: boolean;
  sub_questions: Record<string, SubQuestion[]>;
}

export interface QuestionState {
  questionId: string;
  selectedOptions: string[];
  parentValue?: string;
}

export interface QuestionSequence {
  currentQuestion: CategoryQuestion | SubQuestion;
  parentValue?: string;
  questionId: string;
  depth: number;
}