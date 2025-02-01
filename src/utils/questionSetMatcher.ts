import { CategoryQuestions } from "@/types/estimate";

// Helper function to normalize text for comparison
const normalizeText = (text: string): string => {
  return text.toLowerCase().trim().replace(/[^\w\s]/g, '');
};

// Helper function to check if two task types are similar
const areSimilarTaskTypes = (type1: string, type2: string): boolean => {
  const similarPairs = [
    ['flooring', 'carpet'],
    ['window', 'door'],
    ['kitchen', 'appliance'],
    // Add more similar pairs as needed
  ];

  const normalizedType1 = normalizeText(type1);
  const normalizedType2 = normalizeText(type2);

  return similarPairs.some(([a, b]) => 
    (normalizedType1.includes(a) && normalizedType2.includes(b)) ||
    (normalizedType1.includes(b) && normalizedType2.includes(a))
  );
};

export const findMatchingQuestionSets = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  if (!description || !allQuestionSets?.length) {
    console.log('Invalid input for matching question sets:', { description, setsCount: allQuestionSets?.length });
    return [];
  }

  const matches: { priority: number; questionSet: CategoryQuestions }[] = [];
  const lowercaseDescription = normalizeText(description);
  const processedTaskTypes = new Set<string>();

  console.log('Matching description:', lowercaseDescription);
  console.log('Available question sets:', allQuestionSets.map(qs => qs.category));

  // Find all matching question sets based on keywords
  allQuestionSets.forEach(questionSet => {
    let matchPriority = 0;
    const taskType = questionSet.category.split(' ')[0].toLowerCase();

    // Skip if we already have a similar task type
    if (Array.from(processedTaskTypes).some(type => areSimilarTaskTypes(type, taskType))) {
      console.log(`Skipping similar task type: ${taskType}`);
      return;
    }

    // Check keywords
    if (Array.isArray(questionSet.keywords)) {
      questionSet.keywords.forEach(keyword => {
        if (keyword && lowercaseDescription.includes(normalizeText(keyword))) {
          // Increase priority based on keyword position and specificity
          const keywordPosition = lowercaseDescription.indexOf(normalizeText(keyword));
          const positionBonus = Math.max(0, 1 - (keywordPosition / lowercaseDescription.length));
          const specificityBonus = keyword.length / 20; // Longer keywords get higher priority
          
          matchPriority += 3 + positionBonus + specificityBonus;
          console.log(`Matched keyword: ${keyword} with priority bonus:`, positionBonus + specificityBonus);
        }
      });
    }

    if (matchPriority > 0) {
      console.log(`Matched ${questionSet.category} with priority ${matchPriority}`);
      processedTaskTypes.add(taskType);
      matches.push({
        priority: matchPriority,
        questionSet
      });
    }
  });

  // Sort by priority and remove duplicates
  const sortedMatches = matches
    .sort((a, b) => b.priority - a.priority)
    .map(match => match.questionSet)
    .filter((set, index, self) => 
      index === self.findIndex(s => s.category === set.category)
    );

  console.log('Final matched sets:', sortedMatches.map(set => set.category));
  return sortedMatches;
};

export const consolidateQuestionSets = (
  questionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  if (!Array.isArray(questionSets)) {
    console.warn('Invalid input for consolidating question sets');
    return [];
  }

  console.log('Consolidating question sets:', questionSets.map(set => set.category));
  const processedTaskTypes = new Set<string>();
  
  const consolidated = questionSets.filter(set => {
    if (!set.category) {
      console.warn('Question set missing category');
      return false;
    }

    // Extract task type from category
    const taskType = set.category.split(' ')[0].toLowerCase();
    
    // Check if we already have a similar task type
    if (Array.from(processedTaskTypes).some(type => areSimilarTaskTypes(type, taskType))) {
      console.log(`Skipping similar task type: ${taskType}`);
      return false;
    }
    
    processedTaskTypes.add(taskType);
    return true;
  });

  console.log('Consolidated sets:', consolidated.map(set => set.category));
  return consolidated;
};