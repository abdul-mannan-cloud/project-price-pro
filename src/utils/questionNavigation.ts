
import { Question, Option } from "@/types/estimate";

export const findNextQuestionId = (
  questions: Question[],
  currentQuestion: Question,
  selectedValue: string
): string | null => {
  // First check if the selected option has a next question specified
  const selectedOption = currentQuestion.options.find(
    (opt) => opt.value === selectedValue
  );
  
  if (selectedOption?.next) {
    return selectedOption.next;
  }

  // If the current question has a next property, use that
  if (currentQuestion.next) {
    return currentQuestion.next;
  }

  // If no specific navigation is defined, move to the next question in order
  const currentIndex = questions.findIndex((q) => q.id === currentQuestion.id);
  if (currentIndex < questions.length - 1) {
    return questions[currentIndex + 1].id;
  }

  // If we've reached the end of the questions
  return null;
};

export const calculateQuestionProgress = (
  questions: Question[],
  currentQuestionId: string,
  answers: Record<string, any>
): number => {
  let totalPathLength = 0;
  let currentProgress = 0;
  const visitedQuestions = new Set<string>();
  
  // Calculate the total path length considering branching
  const calculatePath = (questionId: string): void => {
    if (!questionId || visitedQuestions.has(questionId)) return;
    
    visitedQuestions.add(questionId);
    totalPathLength++;
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    // If there's a specific next question defined
    if (question.next) {
      calculatePath(question.next);
      return;
    }
    
    // If this question has been answered, check the branch taken
    const answer = answers[questionId]?.answers?.[0];
    if (answer) {
      const selectedOption = question.options.find(opt => opt.value === answer);
      if (selectedOption?.next) {
        calculatePath(selectedOption.next);
        return;
      }
    }
    
    // If no specific path, continue to next sequential question
    const nextIndex = questions.findIndex(q => q.id === questionId) + 1;
    if (nextIndex < questions.length) {
      calculatePath(questions[nextIndex].id);
    }
  };
  
  // Calculate progress along the current path
  const calculateCurrentProgress = (questionId: string): void => {
    if (!questionId || visitedQuestions.has(questionId)) return;
    
    visitedQuestions.add(questionId);
    currentProgress++;
    
    if (questionId === currentQuestionId) return;
    
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    const answer = answers[questionId]?.answers?.[0];
    if (answer) {
      const selectedOption = question.options.find(opt => opt.value === answer);
      if (selectedOption?.next) {
        calculateCurrentProgress(selectedOption.next);
        return;
      }
    }
    
    if (question.next) {
      calculateCurrentProgress(question.next);
      return;
    }
    
    const nextIndex = questions.findIndex(q => q.id === questionId) + 1;
    if (nextIndex < questions.length) {
      calculateCurrentProgress(questions[nextIndex].id);
    }
  };
  
  // Calculate the full path length
  calculatePath(questions[0].id);
  
  // Reset visited questions and calculate current progress
  visitedQuestions.clear();
  calculateCurrentProgress(questions[0].id);
  
  return (currentProgress / totalPathLength) * 100;
};
