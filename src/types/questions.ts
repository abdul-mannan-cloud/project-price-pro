export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface SubQuestion {
  id: string;
  question: string;
  description?: string;  // Added description as optional
  selections: (string | QuestionOption)[];
  options: QuestionOption[];
  multi_choice: boolean;
  is_branching: boolean;
  sub_questions: Record<string, SubQuestion[]>;
}

export interface CategoryQuestion {
  id: string;
  question: string;
  description?: string;  // Added description as optional
  selections: (string | QuestionOption)[];
  options: QuestionOption[];
  is_branching: boolean;
  multi_choice: boolean;
  sub_questions: Record<string, SubQuestion[]>;
}

export interface QuestionSequence {
  currentQuestion: CategoryQuestion | SubQuestion;
  parentValue?: string;
  questionId: string;
  depth: number;
}