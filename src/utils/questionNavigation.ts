import { Question } from "@/types/estimate";

export const findNextQuestionId = (
  questions: Question[],
  currentQuestion: Question,
  selectedValue: string
): string | null => {
  console.log('Navigation attempt:', {
    currentQuestionId: currentQuestion.id,
    selectedValue,
    currentQuestion: {
      type: currentQuestion.type,
      options: currentQuestion.options
    }
  });

  // Find the selected option
  const selectedOption = currentQuestion.options.find(opt => opt.value === selectedValue);
  
  // If the option has a next question specified, use that
  if (selectedOption?.next) {
    console.log('Following option-specific next:', selectedOption.next);
    return selectedOption.next;
  }

  // If the question has a default next question, use that
  if (currentQuestion.next) {
    console.log('Following default next:', currentQuestion.next);
    return currentQuestion.next;
  }

  // Find the next question by order
  const nextQuestion = questions.find(q => q.order === currentQuestion.order + 1);
  if (nextQuestion) {
    console.log('Following sequential order:', nextQuestion.id);
    return nextQuestion.id;
  }

  // If we reach here, we've reached the end of the questionnaire
  console.log('No next question found, ending questionnaire');
  return null;
};

export const findQuestionById = (questions: Question[], id: string): Question | undefined => {
  return questions.find(q => q.id === id);
};

export const initializeQuestions = (rawQuestions: Question[]): Question[] => {
  // Sort questions by order and ensure all required fields are present
  const questions = [...rawQuestions]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((q, index) => ({
      ...q,
      order: q.order || index + 1,
      type: q.type || (q.options.length === 2 && 
             q.options[0].label === 'Yes' && 
             q.options[1].label === 'No' ? 'yes_no' : 'single_choice')
    }));

  // Log initialized questions for debugging
  console.log('Initialized questions:', questions.map(q => ({
    id: q.id,
    order: q.order,
    type: q.type,
    optionsCount: q.options.length
  })));
  
  return questions;
};