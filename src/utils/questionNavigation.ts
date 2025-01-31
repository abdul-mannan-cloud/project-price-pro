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

  // For Yes/No questions, strictly follow next_question or next_if_no
  if (currentQuestion.is_branching) {
    if (selectedAnswer === 'Yes' && currentQuestion.next_question) {
      return questions.findIndex(q => q.order === currentQuestion.next_question);
    }
    if (selectedAnswer === 'No' && currentQuestion.next_if_no) {
      return questions.findIndex(q => q.order === currentQuestion.next_if_no);
    }
  }
  
  // For non-branching questions, follow next_question if specified
  if (currentQuestion.next_question) {
    return questions.findIndex(q => q.order === currentQuestion.next_question);
  }
  
  // Default to next sequential order if no specific navigation is defined
  const nextOrder = (currentQuestion.order || 0) + 1;
  return questions.findIndex(q => q.order === nextOrder);
};

export const initializeQuestions = (rawQuestions: any[]): Question[] => {
  const validQuestions = rawQuestions.filter(q => typeof q.order === 'number');
  const sortedQuestions = [...validQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));

  return sortedQuestions.map(q => ({
    ...q,
    id: `q-${q.order}`,
    options: q.selections?.map((selection: string, index: number) => ({
      id: `${q.order}-${index}`,
      label: selection
    })) || [],
    is_branching: q.selections?.length === 2 && 
                  q.selections.includes('Yes') && 
                  q.selections.includes('No')
  }));
};