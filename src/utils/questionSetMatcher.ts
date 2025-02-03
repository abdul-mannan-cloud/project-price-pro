import { Category, CategoryQuestions, Question, isCategoryWithQuestions, categoryToQuestionSet } from "@/types/estimate";

interface MatchedQuestionSet {
  priority: number;
  questionSet: CategoryQuestions;
}

/**
 * Finds all matching question sets based on the given description.
 * Uses keyword matching with priority scoring based on match frequency.
 */
export async function findMatchingQuestionSets(
  description: string,
  categories: Category[]
): Promise<CategoryQuestions[]> {
  const lowerDesc = description.toLowerCase();
  const matches: MatchedQuestionSet[] = [];
  console.log("findMatchingQuestionSets: description =", lowerDesc);

  categories.forEach((category) => {
    if (!category.keywords) {
      console.log(`Skipping category ${category.id}: no keywords array`);
      return;
    }

    // Count how many keywords match
    const matchingKeywords = category.keywords.filter(keyword => {
      const kw = keyword.trim().toLowerCase();
      const isMatch = lowerDesc.includes(kw);
      console.log(`Checking keyword: "${kw}" with includes() -> match:`, isMatch);
      return isMatch;
    });

    if (matchingKeywords.length > 0) {
      const questionSet: CategoryQuestions = {
        category: category.id,
        keywords: category.keywords,
        questions: isCategoryWithQuestions(category) 
          ? category.questions 
          : getDefaultQuestionsForCategory(category.id)
      };

      matches.push({
        priority: matchingKeywords.length,
        questionSet
      });
      console.log("Matched category:", category.id, "with priority:", matchingKeywords.length);
    }
  });

  // Sort by priority (most matches first) and extract just the question sets
  const sortedMatches = matches
    .sort((a, b) => b.priority - a.priority)
    .map(match => match.questionSet);

  console.log("findMatchingQuestionSets: sorted matches =", sortedMatches);
  return sortedMatches;
}

/**
 * Consolidates multiple matched question sets to prevent overlapping or redundant questions.
 */
export function consolidateQuestionSets(
  matches: CategoryQuestions[],
  description: string
): CategoryQuestions[] {
  const uniqueCategories = new Map<string, CategoryQuestions>();
  
  matches.forEach(match => {
    if (!uniqueCategories.has(match.category)) {
      uniqueCategories.set(match.category, match);
    }
  });

  return Array.from(uniqueCategories.values());
}

/**
 * Gets the best matching category based on keyword matches.
 */
export const getBestMatchingCategory = async (
  description: string,
  categories: Category[]
): Promise<CategoryQuestions | null> => {
  const matches = await findMatchingQuestionSets(description, categories);
  return matches.length > 0 ? matches[0] : null;
};

/**
 * Provides default questions for common categories.
 */
function getDefaultQuestionsForCategory(categoryId: string): Question[] {
  const id = categoryId.toLowerCase();
  
  if (id.includes("kitchen")) {
    return [
      {
        id: "Q1",
        order: 1,
        question: "What type of kitchen project are you planning?",
        type: "single_choice",
        options: [
          { label: "Full Remodel", value: "full_remodel", next: "Q2" },
          { label: "Partial Update", value: "partial_update", next: "Q3" },
          { label: "Appliance Installation", value: "appliance", next: "NEXT_BRANCH" }
        ],
        next: ""
      }
    ];
  }
  
  // Default questions for any category
  return [
    {
      id: "default-1",
      order: 1,
      question: "What is the scope of your project?",
      type: "single_choice",
      options: [
        { label: "Small Repair", value: "small" },
        { label: "Medium Project", value: "medium" },
        { label: "Large Project", value: "large" }
      ],
      next: "END"
    }
  ];
}