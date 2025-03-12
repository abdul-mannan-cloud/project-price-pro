import { Question, Option, QuestionAnswer } from "@/types/estimate";

/**
 * Finds the next question ID based on the current question and selected answer
 */
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

/**
 * Calculates question progress with improved handling of dynamic branching
 *
 * @param questions The array of questions in the current question set
 * @param currentQuestionId The ID of the currently displayed question
 * @param answers The current answers for this question set
 * @param totalQuestionSets The total number of question sets
 * @param currentSetIndex The index of the current question set
 * @returns Progress as a percentage (0-100)
 */
export const calculateQuestionProgress = (
    questions: Question[],
    currentQuestionId: string,
    answers: Record<string, QuestionAnswer>,
    totalQuestionSets: number,
    currentSetIndex: number = 0
): number => {
  // Graph-based approach for dynamic question paths
  const answeredQuestionIds = Object.keys(answers);

  // Estimate total questions that will be answered in this path
  const estimatedTotalQuestions = estimateTotalQuestionsInPath(questions, answers);

  // Count answered questions plus the current one if not already answered
  let completedQuestions = answeredQuestionIds.length;
  if (currentQuestionId && !answeredQuestionIds.includes(currentQuestionId)) {
    completedQuestions += 0.5; // Count current question as half-completed
  }

  // Calculate progress within the current set
  const currentSetProgress = Math.min(
      completedQuestions / Math.max(estimatedTotalQuestions, 1),
      1.0
  );

  // Calculate overall progress including completed sets
  const questionSetWeight = 1 / totalQuestionSets;
  const completedSetsProgress = currentSetIndex * questionSetWeight;
  const currentSetContribution = currentSetProgress * questionSetWeight;

  // Return the total progress as a percentage
  return (completedSetsProgress + currentSetContribution) * 100;
};

/**
 * Estimates the total number of questions in the dynamic path based on current answers
 */
function estimateTotalQuestionsInPath(
    questions: Question[],
    answers: Record<string, QuestionAnswer>
): number {
  if (!questions.length) return 1;

  // Start from the first question
  const startQuestionId = questions[0].id;
  if (!startQuestionId) return 1;

  const visitedQuestionIds = new Set<string>();
  const estimatedPath: string[] = [];

  // Simulate the question path based on current answers
  simulatePath(
      startQuestionId,
      questions,
      answers,
      visitedQuestionIds,
      estimatedPath
  );

  // To avoid weird edge cases where no paths are found, ensure at least 1 question
  return Math.max(estimatedPath.length, 1);
}

/**
 * Simulates the path a user would take through questions based on their answers
 */
function simulatePath(
    questionId: string,
    questions: Question[],
    answers: Record<string, QuestionAnswer>,
    visitedQuestionIds: Set<string>,
    estimatedPath: string[]
): void {
  // Prevent infinite loops
  if (visitedQuestionIds.has(questionId)) return;
  visitedQuestionIds.add(questionId);
  estimatedPath.push(questionId);

  const question = questions.find(q => q.id === questionId);
  if (!question) return;

  // If user has already answered this question, use their answer to determine path
  if (answers[questionId]) {
    const userAnswer = answers[questionId];

    if (question.type === 'multiple_choice') {
      // For multiple choice, check if any selected options lead to special navigation
      const selectedValues = userAnswer.answers || [];

      // Check if any selected option has a 'NEXT_BRANCH' next value
      const hasNextBranch = selectedValues.some(value => {
        const option = question.options.find(opt => opt.value === value);
        return option?.next === 'NEXT_BRANCH';
      });

      if (hasNextBranch) {
        // If there's a branch transition, we can't easily predict the path
        // So we estimate based on average number of questions per branch
        const avgQuestionsPerBranch = Math.ceil(questions.length / 2);
        for (let i = 0; i < avgQuestionsPerBranch; i++) {
          estimatedPath.push(`estimated_q_${i}`);
        }
        return;
      }

      // Check for explicit next questions from selected options
      const nextQuestions = selectedValues
          .map(value => {
            const option = question.options.find(opt => opt.value === value);
            return option?.next;
          })
          .filter(next => next && next !== 'END' && next !== 'NEXT_BRANCH') as string[];

      if (nextQuestions.length > 0) {
        // Follow each possible next path
        for (const nextId of nextQuestions) {
          simulatePath(nextId, questions, answers, visitedQuestionIds, estimatedPath);
        }
        return;
      }
    } else {
      // For single-choice questions, follow the selected option's path
      const selectedValue = userAnswer.answers?.[0];
      if (selectedValue) {
        const selectedOption = question.options.find(opt => opt.value === selectedValue);

        if (selectedOption?.next === 'NEXT_BRANCH') {
          // If there's a branch transition, estimate remaining questions
          const avgQuestionsPerBranch = Math.ceil(questions.length / 2);
          for (let i = 0; i < avgQuestionsPerBranch; i++) {
            estimatedPath.push(`estimated_q_${i}`);
          }
          return;
        } else if (selectedOption?.next === 'END') {
          // End of questions
          return;
        } else if (selectedOption?.next) {
          // Follow the explicit next question
          simulatePath(selectedOption.next, questions, answers, visitedQuestionIds, estimatedPath);
          return;
        }
      }
    }
  }

  // For unanswered questions or when no specific path is determined,
  // use heuristics to estimate the most likely path

  // If there's an explicit next question defined
  if (question.next) {
    simulatePath(question.next, questions, answers, visitedQuestionIds, estimatedPath);
    return;
  }

  // Otherwise follow the default order
  const nextIndex = questions.findIndex(q => q.id === questionId) + 1;
  if (nextIndex < questions.length) {
    simulatePath(questions[nextIndex].id, questions, answers, visitedQuestionIds, estimatedPath);
  }
}

/**
 * Prevents progress from moving backward for small changes
 * and ensures smooth transitions by limiting large jumps
 */
export const smoothProgress = (current: number, target: number): number => {
  // Don't decrease progress unless it's a significant change (avoids small fluctuations)
  if (target < current && (current - target) < 10) {
    return current;
  }

  // For increases, move smoothly by limiting the maximum increase
  const maxIncrease = 5; // Maximum percentage points to increase at once
  if (target > current && (target - current) > maxIncrease) {
    return current + maxIncrease;
  }

  return target;
};