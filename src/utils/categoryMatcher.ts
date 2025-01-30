type CategoryMatch = {
  categoryId: string;
  confidence: number;
};

const categoryKeywords: Record<string, string[]> = {
  "Painting": [
    "paint", "painting", "walls", "ceilings", "trim", "interior paint",
    "exterior paint", "cabinet paint", "coats", "primer"
  ],
  "Kitchen Remodel": [
    "kitchen remodel", "cabinets", "countertops", "appliances", "sink", "faucet",
    "backsplash", "pantry", "cooking", "refrigerator", "stove", "oven"
  ],
  "Bathroom Remodel": [
    "bathroom remodel", "shower", "tub", "toilet", "vanity", "tile", "plumbing",
    "faucet", "mirror", "bath"
  ],
  "Basement Remodeling": [
    "basement", "foundation", "underground", "cellar", "lower level",
    "waterproofing", "finishing"
  ]
};

export const findBestMatchingCategory = (description: string): CategoryMatch | null => {
  if (!description) return null;
  
  const lowercaseDescription = description.toLowerCase();
  let bestMatch: CategoryMatch | null = null;
  let highestConfidence = 0;

  Object.entries(categoryKeywords).forEach(([categoryId, keywords]) => {
    let matchCount = 0;
    let totalKeywords = keywords.length;

    keywords.forEach(keyword => {
      if (lowercaseDescription.includes(keyword.toLowerCase())) {
        // Give higher weight to matches at the start of the description
        const keywordIndex = lowercaseDescription.indexOf(keyword.toLowerCase());
        const positionWeight = 1 - (keywordIndex / lowercaseDescription.length);
        matchCount += 1 + positionWeight;
      }
    });

    const confidence = matchCount / totalKeywords;

    // Prioritize matches that appear earlier in the text
    if (confidence > 0 && confidence > highestConfidence) {
      bestMatch = { categoryId, confidence };
      highestConfidence = confidence;
    }
  });

  return bestMatch && bestMatch.confidence >= 0.15 ? bestMatch : null;
};