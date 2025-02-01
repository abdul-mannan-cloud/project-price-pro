import { CategoryQuestions, Question, QuestionFlow } from "@/types/estimate";

export const initializeQuestionFlow = (matchedSets: CategoryQuestions[]): QuestionFlow => {
  console.log('Initializing question flow with sets:', matchedSets);
  
  if (matchedSets.length === 0) {
    return {
      category: '',
      questions: [],
      currentQuestionId: null,
      answers: {},
      taskBranches: []
    };
  }

  // Take the first matched set as the primary category
  const primarySet = matchedSets[0];
  
  // Sort questions by order
  const sortedQuestions = [...primarySet.questions].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : Number(a.order);
    const orderB = typeof b.order === 'number' ? b.order : Number(b.order);
    return orderA - orderB;
  });

  // Find the first question
  const startingQuestion = sortedQuestions[0];

  return {
    category: primarySet.category,
    questions: sortedQuestions,
    currentQuestionId: startingQuestion?.id || null,
    answers: {},
    taskBranches: []
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
  const currentIndex = questions.findIndex(q => q.id === currentQuestion.id);
  if (currentIndex < questions.length - 1) {
    const nextQuestion = questions[currentIndex + 1];
    console.log('Moving to next question in sequence:', nextQuestion.id);
    return nextQuestion.id;
  }

  console.log('No next question found');
  return null;
};

export const updateQuestionFlow = (
  flow: QuestionFlow,
  answer: string | string[]
): QuestionFlow => {
  if (!flow.currentQuestionId) {
    return flow;
  }

  const currentQuestion = flow.questions.find(
    q => q.id === flow.currentQuestionId
  );

  if (!currentQuestion) {
    return flow;
  }

  // Update answers
  const newAnswers = {
    ...flow.answers,
    [flow.category]: {
      ...flow.answers[flow.category],
      [currentQuestion.id]: Array.isArray(answer) ? answer : [answer]
    }
  };

  // Find next question
  const nextQuestionId = findNextQuestion(
    flow.questions,
    currentQuestion,
    answer
  );

  // If no next question, check for task branches
  if (!nextQuestionId && flow.taskBranches && flow.taskBranches.length > 0) {
    const currentTaskIndex = flow.taskBranches.findIndex(t => !t.completed);
    
    if (currentTaskIndex >= 0) {
      const updatedBranches = flow.taskBranches.map((branch, index) => 
        index === currentTaskIndex ? { ...branch, completed: true } : branch
      );
      
      const nextTask = updatedBranches.find((t, i) => i > currentTaskIndex && !t.completed);
      
      if (nextTask) {
        return {
          ...flow,
          currentQuestionId: nextTask.next,
          answers: newAnswers,
          taskBranches: updatedBranches
        };
      }
    }
  }

  return {
    ...flow,
    currentQuestionId: nextQuestionId,
    answers: newAnswers
  };
};