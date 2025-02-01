export interface Option {
  label: string;
  value: string;
  next?: string;
  image_url?: string;
  branch_next?: string;
  skip_to_branch?: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice';
  order: number;
  options: Option[];
  next?: string;
  branch_id: string;
  keywords?: string[];
  is_branch_start?: boolean;
  skip_branch_on_no?: boolean;
  priority?: number;
}

export interface CategoryQuestions {
  category: string;
  keywords: string[];
  questions: Question[];
  branch_id?: string;
  priority?: number;
  dependencies?: string[];
  merge_rules?: {
    mergeable_with?: string[];
    merge_priority?: number;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  keywords?: string[];
}

export interface EstimateFormState {
  currentQuestionId: string | null;
  answers: Record<string, string[]>;
  isComplete: boolean;
}

export interface QuestionBranch {
  category: string;
  questions: Question[];
  currentQuestionId: string | null;
  isComplete: boolean;
  branch_id: string;
  priority: number;
}

export interface TaskBranch {
  value: string;
  next: string;
  completed?: boolean;
}

export interface QuestionFlow {
  category: string;
  questions: Question[];
  currentQuestionId: string | null;
  answers: Record<string, Record<string, string[]>>;
  taskBranches?: TaskBranch[];
}

export interface BranchMergeRule {
  source_branch: string;
  target_branch: string;
  merge_type: 'append' | 'interleave' | 'replace';
  condition?: {
    question_id: string;
    answer_values: string[];
  };
}

export interface BranchNavigationRule {
  branch_id: string;
  condition: {
    question_id: string;
    answer_values: string[];
  };
  next_branch_id: string;
  skip_remaining?: boolean;
}