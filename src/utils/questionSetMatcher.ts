import { CategoryQuestions, Question } from "@/types/estimate";

/**
 * Finds matching question sets based on keywords in the description
 * @param description - User's project description
 * @param allQuestionSets - Available question sets to match against
 * @returns Array of matching question sets sorted by relevance
 */
export const findMatchingQuestionSets = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  if (!description || !allQuestionSets?.length) {
    console.log('Invalid input for matching question sets');
    return [];
  }

  const matches: { priority: number; questionSet: CategoryQuestions }[] = [];
  const lowercaseDescription = description.toLowerCase().trim();

  // Find all matching question sets based on keywords
  allQuestionSets.forEach(questionSet => {
    if (!Array.isArray(questionSet.keywords)) {
      console.warn(`Invalid keywords for question set: ${questionSet.category}`);
      return;
    }

    const matchingKeywords = questionSet.keywords.filter(keyword =>
      keyword && lowercaseDescription.includes(keyword.toLowerCase())
    );

    if (matchingKeywords.length > 0) {
      matches.push({
        priority: matchingKeywords.length,
        questionSet
      });
    }
  });

  // Sort by priority (number of matching keywords) and remove duplicates
  return matches
    .sort((a, b) => b.priority - a.priority)
    .map(match => match.questionSet)
    .filter((set, index, self) => 
      index === self.findIndex(s => s.category === set.category)
    );
};

/**
 * Consolidates question sets to prevent overlapping task types
 * @param questionSets - Array of question sets to consolidate
 * @returns Filtered array of question sets with unique task types
 */
export const consolidateQuestionSets = (
  questionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  if (!Array.isArray(questionSets)) {
    console.warn('Invalid input for consolidating question sets');
    return [];
  }

  const taskTypes = new Set<string>();
  
  return questionSets.filter(set => {
    if (!set.category) {
      console.warn('Question set missing category');
      return false;
    }

    // Extract task type from category or first question
    const taskType = set.category.split(' ')[0].toLowerCase();
    
    if (taskTypes.has(taskType)) {
      return false;
    }
    
    taskTypes.add(taskType);
    return true;
  });
};

/**
 * Gets the best matching category based on description
 * @param description - User's project description
 * @param allQuestionSets - Available question sets to match against
 * @returns Best matching question set or null if no match found
 */
export const getBestMatchingCategory = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions | null => {
  const matches = findMatchingQuestionSets(description, allQuestionSets);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Gets the initial question from a question set
 * @param questionSet - The question set to get the initial question from
 * @returns The first question in the set or null if not found
 */
export const getInitialQuestion = (questionSet: CategoryQuestions): Question | null => {
  if (!questionSet?.questions?.length) {
    return null;
  }
  return questionSet.questions.find(q => q.order === 1) || questionSet.questions[0];
};

/**
 * Gets the next question based on the current question and answer
 * @param currentQuestion - The current question being answered
 * @param answer - The user's answer (single value or array for multiple choice)
 * @param questionSet - The current question set
 * @returns The next question or null if at the end
 */
export const getNextQuestion = (
  currentQuestion: Question,
  answer: string | string[],
  questionSet: CategoryQuestions
): Question | null => {
  if (!currentQuestion || !questionSet?.questions) {
    return null;
  }

  // For multiple choice questions
  if (Array.isArray(answer)) {
    const nextQuestionIds = currentQuestion.options
      .filter(opt => answer.includes(opt.value))
      .map(opt => opt.next)
      .filter((next): next is string => 
        next !== undefined && 
        next !== 'END' && 
        next !== 'NEXT_BRANCH'
      );

    if (nextQuestionIds.length > 0) {
      return questionSet.questions.find(q => q.id === nextQuestionIds[0]) || null;
    }
  } else {
    // For single choice/yes-no questions
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer);
    if (selectedOption?.next && 
        selectedOption.next !== 'END' && 
        selectedOption.next !== 'NEXT_BRANCH') {
      return questionSet.questions.find(q => q.id === selectedOption.next) || null;
    }
  }

  // If no specific next question is defined, try to get the next question by order
  const currentIndex = questionSet.questions.findIndex(q => q.id === currentQuestion.id);
  return currentIndex < questionSet.questions.length - 1 
    ? questionSet.questions[currentIndex + 1] 
    : null;
};