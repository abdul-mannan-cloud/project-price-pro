import { CategoryQuestions, Question } from "@/types/estimate";

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

  console.log('Matching description:', lowercaseDescription);
  console.log('Available question sets:', allQuestionSets.map(qs => qs.category));

  // Kitchen remodel specific keywords
  const kitchenKeywords = [
    'kitchen', 'cabinets', 'countertops', 'backsplash', 'appliances',
    'sink', 'tile', 'remodel', 'renovation', 'demo', 'demolition'
  ];

  // Find all matching question sets based on keywords
  allQuestionSets.forEach(questionSet => {
    let matchPriority = 0;
    const isKitchenSet = questionSet.category.toLowerCase().includes('kitchen');

    // Check custom keywords first
    if (Array.isArray(questionSet.keywords)) {
      const matchingKeywords = questionSet.keywords.filter(keyword =>
        keyword && lowercaseDescription.includes(keyword.toLowerCase())
      );
      matchPriority += matchingKeywords.length * 2; // Give more weight to custom keywords
    }

    // For kitchen sets, check additional common keywords
    if (isKitchenSet) {
      const matchingKitchenKeywords = kitchenKeywords.filter(keyword =>
        lowercaseDescription.includes(keyword)
      );
      matchPriority += matchingKitchenKeywords.length;
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
  return matches
    .sort((a, b) => b.priority - a.priority)
    .map(match => match.questionSet)
    .filter((set, index, self) => 
      index === self.findIndex(s => s.category === set.category)
    );
};

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

    // Extract task type from category
    const taskType = set.category.split(' ')[0].toLowerCase();
    
    if (taskTypes.has(taskType)) {
      return false;
    }
    
    taskTypes.add(taskType);
    return true;
  });
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