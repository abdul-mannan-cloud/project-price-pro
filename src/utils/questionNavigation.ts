import { Question, QuestionOption } from "@/types/estimate";

export const findNextQuestionId = (
  questions: Question[],
  currentQuestion: Question,
  selectedValue: string
): string | null => {
  // First, check if the selected option has a next question specified.
  const selectedOption = currentQuestion.options.find(
    (opt) => opt.value === selectedValue
  );
  
  if (selectedOption?.next) {
    return selectedOption.next;
  }

  // Next, if the current question itself has a "next" property, use that.
  if (currentQuestion.next) {
    return currentQuestion.next;
  }

  // Otherwise, fallback to the next question in the array order.
  const currentIndex = questions.findIndex((q) => q.id === currentQuestion.id);
  if (currentIndex !== -1 && currentIndex < questions.length - 1) {
    return questions[currentIndex + 1].id;
  }

  // If there are no more questions, return null.
  return null;
};
