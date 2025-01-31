import { Question } from "@/types/estimate";
import { toast } from "@/hooks/use-toast";

export const findNextQuestionIndex = (
  questions: Question[],
  currentQuestion: Question,
  selectedAnswer: string | undefined
): number => {
  console.log('Navigation params:', {
    currentOrder: currentQuestion.order,
    selectedAnswer,
    nextIfYes: currentQuestion.next_question,
    nextIfNo: currentQuestion.next_if_no,
    selections: currentQuestion.selections
  });

  // Validate that we have a selected answer
  if (!selectedAnswer) {
    toast({
      title: "Navigation Error",
      description: "No answer selected for current question",
      variant: "destructive",
    });
    return -1;
  }

  // Handle Yes/No questions with branching logic
  if (Array.isArray(currentQuestion.selections) && 
      currentQuestion.selections.length === 2 && 
      currentQuestion.selections[0] === 'Yes' && 
      currentQuestion.selections[1] === 'No') {
    
    // For Yes answers, validate and go to next_question
    if (selectedAnswer === 'Yes') {
      if (currentQuestion.next_question === undefined) {
        toast({
          title: "Navigation Error",
          description: `Missing next_question for Yes answer on question ${currentQuestion.order}`,
          variant: "destructive",
        });
        return -1;
      }
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
      if (nextIndex === -1) {
        toast({
          title: "Navigation Error",
          description: `Invalid next_question ${currentQuestion.next_question} for question ${currentQuestion.order}`,
          variant: "destructive",
        });
        return -1;
      }
      console.log('Yes selected, going to order:', currentQuestion.next_question, 'index:', nextIndex);
      return nextIndex;
    }
    
    // For No answers, validate and go to next_if_no
    if (selectedAnswer === 'No') {
      if (currentQuestion.next_if_no === undefined) {
        toast({
          title: "Navigation Error",
          description: `Missing next_if_no for No answer on question ${currentQuestion.order}`,
          variant: "destructive",
        });
        return -1;
      }
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
      if (nextIndex === -1) {
        toast({
          title: "Navigation Error",
          description: `Invalid next_if_no ${currentQuestion.next_if_no} for question ${currentQuestion.order}`,
          variant: "destructive",
        });
        return -1;
      }
      console.log('No selected, going to order:', currentQuestion.next_if_no, 'index:', nextIndex);
      return nextIndex;
    }
  }
  
  // For non-Yes/No questions, validate and follow next_question
  if (currentQuestion.next_question === undefined) {
    toast({
      title: "Navigation Error",
      description: `Missing next_question for question ${currentQuestion.order}`,
      variant: "destructive",
    });
    return -1;
  }

  const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
  if (nextIndex === -1) {
    toast({
      title: "Navigation Error",
      description: `Invalid next_question ${currentQuestion.next_question} for question ${currentQuestion.order}`,
      variant: "destructive",
    });
    return -1;
  }

  console.log('Following next_question to order:', currentQuestion.next_question, 'index:', nextIndex);
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