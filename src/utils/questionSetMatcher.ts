import { CategoryQuestions, Question } from "@/types/estimate";

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

  console.log('Matching description:', lowercaseDescription);
  console.log('Available question sets:', allQuestionSets.map(qs => qs.category));

  // Kitchen remodel specific keywords with weights
  const kitchenKeywords = {
    'kitchen': 5,
    'remodel': 4,
    'cabinets': 3,
    'countertops': 3,
    'backsplash': 2,
    'appliances': 2,
    'sink': 2,
    'tile': 1,
    'renovation': 4,
    'demo': 2,
    'demolition': 2,
    'quartz': 3,
    'granite': 3,
    'marble': 3,
    'drywall': 1,
    'painting': 1,
    'lights': 1,
    'lighting': 1,
    'floor': 1,
    'flooring': 1
  };

  // Find all matching question sets based on keywords
  allQuestionSets.forEach(questionSet => {
    let matchPriority = 0;
    const isKitchenSet = questionSet.category.toLowerCase().includes('kitchen');

    // Check custom keywords first
    if (Array.isArray(questionSet.keywords)) {
      questionSet.keywords.forEach(keyword => {
        if (keyword && lowercaseDescription.includes(keyword.toLowerCase())) {
          matchPriority += 3; // Base priority for custom keywords
          console.log(`Matched custom keyword: ${keyword}`);
        }
      });
    }

    // For kitchen sets, check additional common keywords with weights
    if (isKitchenSet) {
      Object.entries(kitchenKeywords).forEach(([keyword, weight]) => {
        if (lowercaseDescription.includes(keyword)) {
          matchPriority += weight;
          console.log(`Matched kitchen keyword: ${keyword} with weight ${weight}`);
        }
      });
    }

    if (matchPriority > 0) {
      console.log(`Matched ${questionSet.category} with priority ${matchPriority}`);
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

export const getBestMatchingCategory = (
  description: string,
  allQuestionSets: CategoryQuestions[]
): CategoryQuestions | null => {
  const matches = findMatchingQuestionSets(description, allQuestionSets);
  return matches.length > 0 ? matches[0] : null;
};

export const getInitialQuestion = (questionSet: CategoryQuestions): Question | null => {
  if (!questionSet?.questions?.length) {
    return null;
  }
  return questionSet.questions.find(q => q.order === 1) || questionSet.questions[0];
};

export const getNextQuestion = (
  currentQuestion: Question,
  answer: string | string[],
  questionSet: CategoryQuestions
): Question | null => {
  if (!currentQuestion || !questionSet?.questions) {
    return null;
  }

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
    const selectedOption = currentQuestion.options.find(opt => opt.value === answer);
    if (selectedOption?.next && 
        selectedOption.next !== 'END' && 
        selectedOption.next !== 'NEXT_BRANCH') {
      return questionSet.questions.find(q => q.id === selectedOption.next) || null;
    }
  }

  const currentIndex = questionSet.questions.findIndex(q => q.id === currentQuestion.id);
  return currentIndex < questionSet.questions.length - 1 
    ? questionSet.questions[currentIndex + 1] 
    : null;
};
