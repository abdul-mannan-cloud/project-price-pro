import { Category, CategoryQuestions, Question } from "@/types/estimate";

interface MatchedQuestionSet {
  priority: number;
  questionSet: CategoryQuestions;
}

export async function findMatchingQuestionSets(
  description: string,
  categories: Category[],
): Promise<CategoryQuestions[]> {
  const lowerDesc = description.toLowerCase();
  const matches: MatchedQuestionSet[] = [];

  categories.forEach((category) => {
    if (!category.keywords || category.keywords.length === 0) {
      return;
    }

    // Count how many keywords match
    const matchingKeywords = category.keywords.filter((keyword) => {
      const kw = keyword.trim().toLowerCase();
      const isMatch = lowerDesc.includes(kw);
      return isMatch;
    });

    if (matchingKeywords.length > 0) {
      const questionSet: CategoryQuestions = {
        category: category.id,
        keywords: category.keywords,
        questions:
          category.questions || getDefaultQuestionsForCategory(category.id),
      };

      matches.push({
        priority: matchingKeywords.length,
        questionSet,
      });
      console.log(
        "Matched category:",
        category.id,
        "with priority:",
        matchingKeywords.length,
      );
    }
  });

  // Sort by priority (most matches first) and extract just the question sets
  const sortedMatches = matches
    .sort((a, b) => b.priority - a.priority)
    .map((match) => match.questionSet);

  console.log("findMatchingQuestionSets: sorted matches =", sortedMatches);
  return sortedMatches;
}

export function consolidateQuestionSets(
  matches: CategoryQuestions[],
  description: string,
): CategoryQuestions[] {
  const uniqueCategories = new Map<string, CategoryQuestions>();

  matches.forEach((match) => {
    if (!uniqueCategories.has(match.category)) {
      uniqueCategories.set(match.category, match);
    }
  });

  return Array.from(uniqueCategories.values());
}

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
          { label: "Full Remodel", value: "full_remodel" },
          { label: "Partial Update", value: "partial_update" },
          { label: "Appliance Installation", value: "appliance" },
        ],
      },
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
        { label: "Large Project", value: "large" },
      ],
    },
  ];
}
