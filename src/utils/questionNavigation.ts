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

  // For branching questions (Yes/No)
  if (currentQuestion.selections?.length === 2 && 
      currentQuestion.selections.includes('Yes') && 
      currentQuestion.selections.includes('No')) {
    
    // For "Yes" answers, strictly follow next_question
    if (selectedAnswer === 'Yes') {
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
      console.log('Yes branch, going to order:', currentQuestion.next_question, 'index:', nextIndex);
      return nextIndex;
    }
    
    // For "No" answers, strictly follow next_if_no
    if (selectedAnswer === 'No') {
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
      console.log('No branch, going to order:', currentQuestion.next_if_no, 'index:', nextIndex);
      return nextIndex;
    }
  }
  
  // For non-branching questions, follow next_question if specified
  if (currentQuestion.next_question) {
    const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
    console.log('Following next_question to order:', currentQuestion.next_question, 'index:', nextIndex);
    return nextIndex;
  }
  
  // If no specific navigation is defined, try to find the next sequential question
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
      id: `${q.order}-${optIndex}`,  // Use question order instead of array index
      label: selection
    })) || [],
    is_branching: q.selections?.length === 2 && 
                  q.selections.includes('Yes') && 
                  q.selections.includes('No')
  }));
};