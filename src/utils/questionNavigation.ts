import { Question } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

export const findNextQuestionIndex = (
  questions: Question[],
  currentQuestion: Question,
  selectedLabel: string
): number => {
  console.log('Navigation attempt:', {
    currentOrder: currentQuestion.order,
    selectedLabel,
    nextQuestion: currentQuestion.next_question,
    nextIfNo: currentQuestion.next_if_no
  });

  // Validate required fields
  if (!currentQuestion.order) {
    toast({
      title: "Navigation Error",
      description: "Question order not defined",
      variant: "destructive",
    });
    return -1;
  }

  // Find the next question based on the order
  const currentOrder = currentQuestion.order;
  let nextOrder: number | undefined;

  // Handle Yes/No questions with branching logic
  if (currentQuestion.selections?.length === 2 && 
      currentQuestion.selections[0] === 'Yes' && 
      currentQuestion.selections[1] === 'No') {
    
    nextOrder = selectedLabel === 'Yes' ? 
      currentQuestion.next_question : 
      currentQuestion.next_if_no;
  } else {
    // For non-Yes/No questions, use next_question
    nextOrder = currentQuestion.next_question;
  }

  if (typeof nextOrder !== 'number') {
    toast({
      title: "Navigation Error",
      description: `Missing next question order for question ${currentOrder}`,
      variant: "destructive",
    });
    return -1;
  }

  const nextIndex = questions.findIndex(q => q.order === nextOrder);
  if (nextIndex === -1) {
    toast({
      title: "Navigation Error",
      description: `Invalid next question order ${nextOrder} for question ${currentOrder}`,
      variant: "destructive",
    });
    return -1;
  }

  console.log(`Navigating from order ${currentOrder} to order ${nextOrder}, index: ${nextIndex}`);
  return nextIndex;
};

export const initializeQuestions = (rawQuestions: any[]): Question[] => {
  return [...rawQuestions]
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((q) => ({
      ...q,
      id: `q-${q.order}`,
      options: q.selections?.map((selection: string, optIndex: number) => ({
        id: `${q.order}-${optIndex}`,
        label: selection
      })) || [],
      is_branching: q.selections?.length === 2 && 
                    q.selections[0] === 'Yes' && 
                    q.selections[1] === 'No'
    }));
};