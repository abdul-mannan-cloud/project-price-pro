import { Question } from "@/types/estimate";

export const findNextQuestionIndex = (
  questions: Question[],
  currentQuestion: Question,
  selectedLabel: string
): number => {
  // Log the current navigation attempt
  console.log('Navigation attempt:', {
    currentQuestion: {
      order: currentQuestion.order,
      question: currentQuestion.question,
      next_question: currentQuestion.next_question,
      next_if_no: currentQuestion.next_if_no,
      isYesNo: currentQuestion.selections?.length === 2 && 
               currentQuestion.selections[0] === 'Yes' && 
               currentQuestion.selections[1] === 'No'
    },
    selectedLabel
  });

  // Check if this is a Yes/No question
  const isYesNoQuestion = currentQuestion.selections?.length === 2 && 
                         currentQuestion.selections[0] === 'Yes' && 
                         currentQuestion.selections[1] === 'No';

  if (isYesNoQuestion) {
    // Handle Yes selection
    if (selectedLabel === 'Yes') {
      if (typeof currentQuestion.next_question === 'number') {
        const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
        console.log('Yes selected, navigating to:', {
          nextQuestionOrder: currentQuestion.next_question,
          foundIndex: nextIndex
        });
        return nextIndex;
      }
    }
    // Handle No selection
    else if (selectedLabel === 'No') {
      if (typeof currentQuestion.next_if_no === 'number') {
        const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
        console.log('No selected, navigating to:', {
          nextQuestionOrder: currentQuestion.next_if_no,
          foundIndex: nextIndex
        });
        return nextIndex;
      }
    }
  }
  // Handle non-Yes/No questions with explicit next_question
  else if (typeof currentQuestion.next_question === 'number') {
    const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
    console.log('Following explicit next_question:', {
      nextQuestionOrder: currentQuestion.next_question,
      foundIndex: nextIndex
    });
    return nextIndex;
  }

  // Default to sequential navigation if no specific navigation is defined
  const nextOrder = currentQuestion.order + 1;
  const nextIndex = questions.findIndex(q => q.order === nextOrder);
  console.log('Sequential navigation:', {
    fromOrder: currentQuestion.order,
    toOrder: nextOrder,
    foundIndex: nextIndex
  });
  return nextIndex;
};

export const initializeQuestions = (rawQuestions: Question[]): Question[] => {
  // Sort questions by order and initialize
  const questions = [...rawQuestions]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((q) => ({
      ...q,
      options: q.selections?.map((selection: string, optIndex: number) => ({
        id: `${q.order}-${optIndex}`,
        label: selection
      })) || [],
      is_branching: q.selections?.length === 2 && 
                    q.selections[0] === 'Yes' && 
                    q.selections[1] === 'No'
    }));

  // Log initialized questions for debugging
  console.log('Initialized questions:', questions.map(q => ({
    order: q.order,
    question: q.question,
    next_question: q.next_question,
    next_if_no: q.next_if_no,
    is_branching: q.is_branching
  })));
  
  return questions;
};