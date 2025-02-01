import { Question, QuestionOption } from "@/types/estimate";

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