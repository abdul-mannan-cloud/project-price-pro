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
    nextIfNo: currentQuestion.next_if_no,
    selections: currentQuestion.selections,
    isYesNo: currentQuestion.selections?.length === 2 && 
             currentQuestion.selections[0] === 'Yes' && 
             currentQuestion.selections[1] === 'No'
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

  // For Yes/No questions
  if (currentQuestion.selections?.length === 2 && 
      currentQuestion.selections[0] === 'Yes' && 
      currentQuestion.selections[1] === 'No') {
    
    // If Yes is selected, go to next sequential order
    if (selectedLabel === 'Yes') {
      const nextOrder = currentQuestion.order + 1;
      const nextIndex = questions.findIndex(q => q.order === nextOrder);
      console.log(`Yes selected on order ${currentQuestion.order}, going to order ${nextOrder}`);
      return nextIndex;
    } 
    // If No is selected and next_if_no is specified
    else if (selectedLabel === 'No' && typeof currentQuestion.next_if_no === 'number') {
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
      console.log(`No selected on order ${currentQuestion.order}, going to next_if_no: ${currentQuestion.next_if_no}`);
      return nextIndex;
    }
  }

  // For all other questions, go to next sequential order
  const nextOrder = currentQuestion.order + 1;
  const nextIndex = questions.findIndex(q => q.order === nextOrder);
  
  if (nextIndex === -1) {
    toast({
      title: "Navigation Error",
      description: `Could not find next question with order ${nextOrder}`,
      variant: "destructive",
    });
    return -1;
  }

  console.log(`Sequential navigation from order ${currentQuestion.order} to order ${nextOrder}`);
  return nextIndex;
};

export const initializeQuestions = (rawQuestions: any[]): Question[] => {
  // Sort questions by order
  const questions = [...rawQuestions]
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

  console.log('Initialized questions:', questions);
  return questions;
};