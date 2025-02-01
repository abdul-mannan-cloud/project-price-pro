import { CategoryQuestions, Question, QuestionFlow, QuestionBranch } from "@/types/estimate";

export const initializeQuestionFlow = (matchedSets: CategoryQuestions[]): QuestionFlow => {
  console.log('Initializing question flow with sets:', matchedSets);
  
  const branches: QuestionBranch[] = matchedSets.map((set, index) => {
    // Sort questions by order
    const sortedQuestions = [...set.questions].sort((a, b) => {
      // Handle decimal orders (e.g., 1.1, 1.2)
      const orderA = typeof a.order === 'number' ? a.order : parseFloat(a.order.toString());
      const orderB = typeof b.order === 'number' ? b.order : parseFloat(b.order.toString());
      return orderA - orderB;
    });

    // Find the first question (should be yes/no type)
    const startingQuestion = sortedQuestions.find(q => q.type === 'yes_no') || sortedQuestions[0];
    
    if (!startingQuestion) {
      console.warn(`No starting question found for category ${set.category}`);
    }

    return {
      category: set.category,
      questions: sortedQuestions,
      currentQuestionId: startingQuestion?.id || null,
      isComplete: false,
      branch_id: set.branch_id || `branch-${index}`,
      priority: set.priority || index
    };
  });

  return {
    branches: branches.sort((a, b) => a.priority - b.priority),
    currentBranchIndex: 0,
    answers: {},
    branchOrder: branches.map(branch => branch.branch_id),
    mergedBranches: {}
  };
};

export const findNextQuestion = (
  questions: Question[],
  currentQuestion: Question,
  answer: string | string[]
): string | null => {
  console.log('Finding next question for:', currentQuestion.id, 'with answer:', answer);

  // Handle yes/no questions
  if (currentQuestion.type === 'yes_no' && !Array.isArray(answer)) {
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer);
    
    if (selectedOption?.next === 'NEXT_BRANCH') {
      console.log('Moving to next branch');
      return null;
    }
    
    if (selectedOption?.next) {
      console.log('Moving to specified next question:', selectedOption.next);
      return selectedOption.next;
    }
  }

  // Handle multiple choice questions
  if (currentQuestion.type === 'multiple_choice' && Array.isArray(answer)) {
    // Find the first selected option with a next question
    const nextQuestion = currentQuestion.options
      .filter(opt => answer.includes(opt.value))
      .find(opt => opt.next)?.next;

    if (nextQuestion) {
      console.log('Moving to first selected option next question:', nextQuestion);
      return nextQuestion;
    }
  }

  // Handle single choice questions
  if (currentQuestion.type === 'single_choice' && !Array.isArray(answer)) {
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer);
    if (selectedOption?.next) {
      console.log('Moving to selected option next question:', selectedOption.next);
      return selectedOption.next;
    }
  }

  // If no specific next question is defined, find the next question by order
  const sortedQuestions = [...questions].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : parseFloat(a.order.toString());
    const orderB = typeof b.order === 'number' ? b.order : parseFloat(b.order.toString());
    return orderA - orderB;
  });

  const currentIndex = sortedQuestions.findIndex(q => q.id === currentQuestion.id);
  if (currentIndex < sortedQuestions.length - 1) {
    const nextQuestion = sortedQuestions[currentIndex + 1];
    console.log('Moving to next question in sequence:', nextQuestion.id);
    return nextQuestion.id;
  }

  console.log('No next question found, completing branch');
  return null;
};

export const updateQuestionFlow = (
  flow: QuestionFlow,
  answer: string | string[]
): QuestionFlow => {
  const { branches, currentBranchIndex } = flow;
  const currentBranch = branches[currentBranchIndex];
  
  if (!currentBranch || !currentBranch.currentQuestionId) {
    return flow;
  }

  const currentQuestion = currentBranch.questions.find(
    q => q.id === currentBranch.currentQuestionId
  );

  if (!currentQuestion) {
    return flow;
  }

  // Update answers
  const newAnswers = {
    ...flow.answers,
    [currentBranch.category]: {
      ...flow.answers[currentBranch.category],
      [currentQuestion.id]: Array.isArray(answer) ? answer : [answer]
    }
  };

  // Check if we should skip to next branch (for "no" answers on yes/no questions)
  if (
    currentQuestion.type === 'yes_no' &&
    !Array.isArray(answer) &&
    answer === 'no'
  ) {
    const selectedOption = currentQuestion.options.find(opt => opt.value === 'no');
    if (selectedOption?.next === 'NEXT_BRANCH') {
      const nextBranchIndex = currentBranchIndex + 1;
      const updatedBranches = branches.map((branch, index) => {
        if (index === currentBranchIndex) {
          return { ...branch, isComplete: true, currentQuestionId: null };
        }
        return branch;
      });

      return {
        ...flow,
        branches: updatedBranches,
        currentBranchIndex: nextBranchIndex,
        answers: newAnswers
      };
    }
  }

  // Find next question
  const nextQuestionId = findNextQuestion(
    currentBranch.questions,
    currentQuestion,
    answer
  );

  if (!nextQuestionId) {
    // Move to next branch
    const nextBranchIndex = currentBranchIndex + 1;
    const updatedBranches = branches.map((branch, index) => {
      if (index === currentBranchIndex) {
        return { ...branch, isComplete: true, currentQuestionId: null };
      }
      return branch;
    });

    return {
      ...flow,
      branches: updatedBranches,
      currentBranchIndex: nextBranchIndex,
      answers: newAnswers
    };
  }

  // Update current question in current branch
  const updatedBranches = branches.map((branch, index) => {
    if (index === currentBranchIndex) {
      return { ...branch, currentQuestionId: nextQuestionId };
    }
    return branch;
  });

  return {
    ...flow,
    branches: updatedBranches,
    answers: newAnswers
  };
};