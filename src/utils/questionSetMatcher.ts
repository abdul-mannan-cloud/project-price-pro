import { CategoryQuestions } from "@/types/estimate";

export const findMatchingQuestionSets = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions[] => {
  if (!description || !allQuestionSets?.length) {
    console.log('Invalid input for matching question sets:', { description, setsCount: allQuestionSets?.length });
    return [];
  }

  const matches: { priority: number; questionSet: CategoryQuestions }[] = [];
  const lowercaseDescription = description.toLowerCase().trim();
  const processedTaskTypes = new Set<string>();

  console.log('Matching description:', lowercaseDescription);
  console.log('Available question sets:', allQuestionSets.map(qs => qs.category));

  // Find all matching question sets based on keywords
  allQuestionSets.forEach(questionSet => {
    let matchPriority = 0;
    const taskType = questionSet.category.split(' ')[0].toLowerCase();

    // Skip if we already have a question set for this task type
    if (processedTaskTypes.has(taskType)) {
      console.log(`Skipping duplicate task type: ${taskType}`);
      return;
    }

    // Check keywords
    if (Array.isArray(questionSet.keywords)) {
      questionSet.keywords.forEach(keyword => {
        if (keyword && lowercaseDescription.includes(keyword.toLowerCase())) {
          matchPriority += 3; // Base priority for keyword match
          console.log(`Matched keyword: ${keyword}`);
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
  const taskTypes = new Set<string>();
  
  const consolidated = questionSets.filter(set => {
    if (!set.category) {
      console.warn('Question set missing category');
      return false;
    }

    // Extract task type from category
    const taskType = set.category.split(' ')[0].toLowerCase();
    
    if (taskTypes.has(taskType)) {
      console.log(`Skipping duplicate task type: ${taskType}`);
      return false;
    }
    
    taskTypes.add(taskType);
    return true;
  });

  console.log('Consolidated sets:', consolidated.map(set => set.category));
  return consolidated;
};