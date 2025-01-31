import { Question } from "@/types/estimate";

export const findNextQuestionIndex = (
  questions: Question[],
  currentQuestion: Question,
  selectedAnswer: string | undefined
): number => {
  console.log('Navigation params:', {
    currentOrder: currentQuestion.order,
    selectedAnswer,
    nextIfYes: currentQuestion.next_question,
    nextIfNo: currentQuestion.next_if_no
  });

  // Handle Yes/No questions with branching logic
  if (Array.isArray(currentQuestion.selections) && 
      currentQuestion.selections.length === 2 && 
      currentQuestion.selections[0] === 'Yes' && 
      currentQuestion.selections[1] === 'No') {
    
    // For Yes answers, go to next_question
    if (selectedAnswer === currentQuestion.selections[0]) { // "Yes"
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
      console.log('Yes selected, going to order:', currentQuestion.next_question, 'index:', nextIndex);
      return nextIndex;
    }
    
    // For No answers, go to next_if_no if specified
    if (selectedAnswer === currentQuestion.selections[1]) { // "No"
      if (currentQuestion.next_if_no !== undefined) {
        const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
        console.log('No selected, going to order:', currentQuestion.next_if_no, 'index:', nextIndex);
        return nextIndex;
      }
    }
  }
  
  // For non-Yes/No questions or if no specific branching is defined
  if (currentQuestion.next_question !== undefined) {
    const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
    console.log('Following next_question to order:', currentQuestion.next_question, 'index:', nextIndex);
    return nextIndex;
  }
  
  // If no navigation is defined, try to find the next sequential question
  const nextOrder = (currentQuestion.order || 0) + 1;
  const nextIndex = questions.findIndex(q => q.order === nextOrder);
  console.log('Following sequential order:', nextOrder, 'index:', nextIndex);
  return nextIndex;
};

export const initializeQuestions = (rawQuestions: any[]): Question[] => {
  // Sort questions by order
  const sortedQuestions = [...rawQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));
  
  return sortedQuestions.map((q) => ({
    ...q,
    id: `q-${q.order}`,
    options: q.selections?.map((selection: string, optIndex: number) => ({
      id: `${q.order}-${optIndex}`,
      label: selection
    })) || [],
    is_branching: Array.isArray(q.selections) && 
                  q.selections.length === 2 && 
                  q.selections[0] === 'Yes' && 
                  q.selections[1] === 'No'
  }));
};