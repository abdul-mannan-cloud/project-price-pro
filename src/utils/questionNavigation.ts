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
    selections: currentQuestion.selections
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

  // Handle Yes/No branching questions
  if (currentQuestion.selections?.length === 2 && 
      currentQuestion.selections[0] === 'Yes' && 
      currentQuestion.selections[1] === 'No') {
    
    // For Yes/No questions, check the selected label
    if (selectedLabel === 'Yes') {
      if (typeof currentQuestion.next_question !== 'number') {
        toast({
          title: "Navigation Error",
          description: `Missing next_question for Yes answer on question ${currentQuestion.order}`,
          variant: "destructive",
        });
        return -1;
      }
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_question);
      console.log(`Yes selected, navigating to order: ${currentQuestion.next_question}`);
      return nextIndex;
    } else if (selectedLabel === 'No') {
      if (typeof currentQuestion.next_if_no !== 'number') {
        toast({
          title: "Navigation Error",
          description: `Missing next_if_no for No answer on question ${currentQuestion.order}`,
          variant: "destructive",
        });
        return -1;
      }
      const nextIndex = questions.findIndex(q => q.order === currentQuestion.next_if_no);
      console.log(`No selected, navigating to order: ${currentQuestion.next_if_no}`);
      return nextIndex;
    }
  }

  // For non-Yes/No questions, use next_question
  if (typeof currentQuestion.next_question !== 'number') {
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

  console.log(`Sequential navigation to order: ${currentQuestion.next_question}`);
  return nextIndex;
};

export const initializeQuestions = (rawQuestions: any[]): Question[] => {
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