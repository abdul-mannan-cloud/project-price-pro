import { CategoryQuestions, Question, QuestionFlow, QuestionBranch } from "@/types/estimate";

export const initializeQuestionFlow = (matchedSets: CategoryQuestions[]): QuestionFlow => {
  const branches: QuestionBranch[] = matchedSets.map((set, index) => ({
    category: set.category,
    questions: set.questions,
    currentQuestionId: set.questions[0]?.id || null,
    isComplete: false,
    branch_id: set.branch_id || `branch-${index}`,
    priority: set.priority || index
  }));

  const branchOrder = branches.map(branch => branch.branch_id);

  return {
    branches,
    currentBranchIndex: 0,
    answers: {},
    branchOrder,
    mergedBranches: {}
  };
};

export const findNextQuestion = (
  questions: Question[],
  currentQuestion: Question,
  answer: string | string[]
): string | null => {
  if (Array.isArray(answer)) {
    const nextQuestions = currentQuestion.options
      .filter(opt => answer.includes(opt.value))
      .map(opt => opt.next)
      .filter((next): next is string => 
        next !== undefined && 
        next !== 'END' && 
        next !== 'NEXT_BRANCH'
      );
    
    return nextQuestions[0] || null;
  } else {
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer);
    
    if (selectedOption?.next === 'NEXT_BRANCH') {
      return null;
    }
    
    if (selectedOption?.next && selectedOption.next !== 'END') {
      return selectedOption.next;
    }
  }

  const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
  return currentIndex < questions.length - 1 ? questions[currentIndex + 1].id : null;
};

export const updateQuestionFlow = (
  flow: QuestionFlow,
  answer: string | string[]
): QuestionFlow => {
  const { branches, currentBranchIndex, branchOrder, mergedBranches } = flow;
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

  const newAnswers = {
    ...flow.answers,
    [currentBranch.category]: {
      ...flow.answers[currentBranch.category],
      [currentQuestion.id]: Array.isArray(answer) ? answer : [answer]
    }
  };

  if (
    currentQuestion.type === 'yes_no' && 
    !Array.isArray(answer) && 
    answer === 'no' &&
    currentQuestion.skip_branch_on_no
  ) {
    const nextBranchIndex = currentBranchIndex + 1;
    if (nextBranchIndex < branches.length) {
      const updatedBranches = branches.map((branch, index) => {
        if (index === currentBranchIndex) {
          return { ...branch, isComplete: true, currentQuestionId: null };
        }
        return branch;
      });

      return {
        branches: updatedBranches,
        currentBranchIndex: nextBranchIndex,
        answers: newAnswers,
        branchOrder,
        mergedBranches
      };
    }
  }

  const nextQuestionId = findNextQuestion(
    currentBranch.questions,
    currentQuestion,
    answer
  );

  if (!nextQuestionId) {
    const nextBranchIndex = currentBranchIndex + 1;
    const updatedBranches = branches.map((branch, index) => {
      if (index === currentBranchIndex) {
        return { ...branch, isComplete: true, currentQuestionId: null };
      }
      return branch;
    });

    return {
      branches: updatedBranches,
      currentBranchIndex: nextBranchIndex,
      answers: newAnswers,
      branchOrder,
      mergedBranches
    };
  }

  const updatedBranches = branches.map((branch, index) => {
    if (index === currentBranchIndex) {
      return { ...branch, currentQuestionId: nextQuestionId };
    }
    return branch;
  });

  return {
    branches: updatedBranches,
    currentBranchIndex,
    answers: newAnswers,
    branchOrder,
    mergedBranches
  };
};