import { Question } from "@/types/estimate";

export const findNextQuestionIndex = (
  questions: Question[],
  currentQuestion: Question,
  selectedLabel: string
): number => {
  console.log('Navigation attempt:', {
    currentQuestion: {
      order: currentQuestion.order,
      question: currentQuestion.question,
      next_question: currentQuestion.next_question,
      next_if_no: currentQuestion.next_if_no
    },
    selectedLabel
  });

  // For Yes/No questions
  if (currentQuestion.selections?.length === 2 && 
      currentQuestion.selections[0] === 'Yes' && 
      currentQuestion.selections[1] === 'No') {
    
    if (selectedLabel === 'Yes' && typeof currentQuestion.next_question === 'number') {
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
      console.log('Yes selected, navigating to order:', currentQuestion.next_question, 'index:', nextIndex);
      return nextIndex;
    } 
    
    if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
      console.log('No selected, navigating to order:', currentQuestion.next_if_no, 'index:', nextIndex);
      return nextIndex;
    }
  }

  // For non-Yes/No questions with explicit next_question
  if (typeof currentQuestion.next_question === 'number') {
    const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
    console.log('Following next_question:', currentQuestion.next_question, 'index:', nextIndex);
    return nextIndex;
  }

  // Default sequential navigation
  const nextOrder = currentQuestion.order + 1;
  const nextIndex = questions.findIndex(q => q.order === nextOrder);
  console.log('Sequential navigation to order:', nextOrder, 'index:', nextIndex);
  return nextIndex;
};

export const initializeQuestions = (rawQuestions: Question[]): Question[] => {
  // Sort questions by order
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

  console.log('Initialized questions:', 
    questions.map(q => ({
      order: q.order,
      question: q.question,
      next_question: q.next_question,
      next_if_no: q.next_if_no,
      is_branching: q.is_branching
    }))
  );
  
  return questions;
};