import { CategoryQuestions, Question, QuestionFlow, QuestionBranch } from "@/types/estimate";

export const initializeQuestionFlow = (matchedSets: CategoryQuestions[]): QuestionFlow => {
  const branches: QuestionBranch[] = matchedSets.map(set => ({
    category: set.category,
    questions: set.questions,
    currentQuestionId: set.questions[0]?.id || null,
    isComplete: false
  }));

  return {
    branches,
    currentBranchIndex: 0,
    answers: {}
  };
};

export const findNextQuestion = (
  questions: Question[],
  currentQuestion: Question,
  answer: string | string[]
): string | null => {
  if (Array.isArray(answer)) {
    // For multiple choice questions, get next questions from selected options
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
    // For single choice/yes-no questions
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer);
    
    if (selectedOption?.next === 'NEXT_BRANCH') {
      return null;
    }
    
    if (selectedOption?.next && selectedOption.next !== 'END') {
      return selectedOption.next;
    }
  }

  // If no specific next question, get next by order
  const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
  return currentIndex < questions.length - 1 ? questions[currentIndex + 1].id : null;
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

  // Handle "No" answer for yes/no questions
  if (
    currentQuestion.type === 'yes_no' && 
    !Array.isArray(answer) && 
    answer === 'no'
  ) {
    // Move to next branch
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
        answers: newAnswers
      };
    }
  }

  // Find next question in current branch
  const nextQuestionId = findNextQuestion(
    currentBranch.questions,
    currentQuestion,
    answer
  );

  if (!nextQuestionId) {
    // Current branch is complete, move to next branch
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
      answers: newAnswers
    };
  }

  // Update current branch with next question
  const updatedBranches = branches.map((branch, index) => {
    if (index === currentBranchIndex) {
      return { ...branch, currentQuestionId: nextQuestionId };
    }
    return branch;
  });

  return {
    branches: updatedBranches,
    currentBranchIndex,
    answers: newAnswers
  };
};