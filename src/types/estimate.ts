export interface Option {
  label: string;
  value: string;
  next?: string;
  image_url?: string;
  branch_next?: string; // For branch-specific navigation
  skip_to_branch?: string; // For skipping to another branch
}

export interface Question {
  id: string;
  question: string;
  type: 'yes_no' | 'single_choice' | 'multiple_choice';
  order: number;
  options: Option[];
  next?: string;
  branch_id: string; // Identifier for which branch this question belongs to
  keywords?: string[]; // Keywords associated with this question
  is_branch_start?: boolean; // Indicates if this is the first question in a branch
  skip_branch_on_no?: boolean; // For yes/no questions that can skip entire branches
  priority?: number; // For ordering questions within and across branches
}

export interface CategoryQuestions {
  category: string;
  keywords: string[];
  questions: Question[];
  branch_id?: string; // Unique identifier for this question set
  priority?: number; // For ordering multiple branches
  dependencies?: string[]; // Other categories this might depend on
  merge_rules?: {
    // Rules for merging with other branches
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

export interface QuestionFlow {
  branches: QuestionBranch[];
  currentBranchIndex: number;
  answers: Record<string, Record<string, string[]>>;
  branchOrder: string[]; // Ordered list of branch IDs
  mergedBranches: Record<string, string[]>; // Track which branches were merged
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

// New interfaces for branch management
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
