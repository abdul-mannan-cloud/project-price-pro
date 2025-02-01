import { CategoryQuestions } from "@/types/estimate";

interface MatchedQuestionSet {
  priority: number;
  questionSet: CategoryQuestions;
}

export const findMatchingQuestionSets = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  const matches: MatchedQuestionSet[] = [];
  const lowercaseDescription = description.toLowerCase();

  // Find all matching question sets based on keywords
  allQuestionSets.forEach(questionSet => {
    const matchingKeywords = questionSet.keywords.filter(keyword =>
      lowercaseDescription.includes(keyword.toLowerCase())
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

// Detect overlapping task types to prevent question overload
export const consolidateQuestionSets = (
  questionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  const taskTypes = new Set<string>();
  
  return questionSets.filter(set => {
    // Extract task type from category or first question
    const taskType = set.category.split(' ')[0].toLowerCase();
    
    if (taskTypes.has(taskType)) {
      return false;
    }
    
    taskTypes.add(taskType);
    return true;
  });
};

// Helper function to get the best matching category
export const getBestMatchingCategory = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions | null => {
  const matches = findMatchingQuestionSets(description, allQuestionSets);
  return matches.length > 0 ? matches[0] : null;
};