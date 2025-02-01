import { CategoryQuestions } from "@/types/estimate";

interface MatchedQuestionSet {
  priority: number;
  questionSet: CategoryQuestions;
}

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

  const matches: MatchedQuestionSet[] = [];
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