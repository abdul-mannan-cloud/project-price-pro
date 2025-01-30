type CategoryMatch = {
  categoryId: string;
  confidence: number;
};

const categoryKeywords: Record<string, string[]> = {
  "Kitchen Remodel": [
    "kitchen", "cabinets", "countertops", "appliances", "sink", "faucet",
    "backsplash", "pantry", "cooking", "refrigerator", "stove", "oven"
  ],
  "Bathroom Remodel": [
    "bathroom", "shower", "tub", "toilet", "vanity", "tile", "plumbing",
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

  Object.entries(categoryKeywords).forEach(([categoryId, keywords]) => {
    const matchCount = keywords.reduce((count, keyword) => {
      return count + (lowercaseDescription.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);

    const confidence = matchCount / keywords.length;

    if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { categoryId, confidence };
    }
  });

  return bestMatch && bestMatch.confidence >= 0.15 ? bestMatch : null;
};