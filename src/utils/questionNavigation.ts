import { Question } from "@/types/estimate";

export const findNextQuestionId = (
  questions: Question[],
  currentQuestion: Question,
  selectedValue: string
): string | null => {
  // First check if the selected option has a specific next question
  const selectedOption = currentQuestion.options.find(opt => opt.value === selectedValue);
  if (selectedOption?.next) {
    return selectedOption.next;
  }

  // If no specific navigation is defined, move to the next question in sequence
  const nextQuestion = questions.find(q => q.order === currentQuestion.order + 1);
  return nextQuestion?.id || null;
};