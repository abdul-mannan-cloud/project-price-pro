type CategoryMatch = {
  categoryId: string;
  confidence: number;
};

const categoryKeywords: Record<string, string[]> = {
  "Painting": [
    "paint", "painting", "walls", "ceilings", "trim", "interior paint",
    "exterior paint", "cabinet paint", "coats", "primer", "color", "brush",
    "roller", "spray paint", "repaint"
  ],
  "Kitchen Remodel": [
    "kitchen remodel", "cabinets", "countertops", "appliances", "sink", "faucet",
    "backsplash", "pantry", "cooking", "refrigerator", "stove", "oven",
    "kitchen renovation", "kitchen update"
  ],
  "Bathroom Remodel": [
    "bathroom remodel", "shower", "tub", "toilet", "vanity", "tile", "plumbing",
    "faucet", "mirror", "bath", "bathroom renovation", "bathroom update"
  ],
  "Basement Remodeling": [
    "basement", "foundation", "underground", "cellar", "lower level",
    "waterproofing", "finishing", "basement renovation"
  ]
};

// Helper function to calculate word position weight
const getPositionWeight = (text: string, keyword: string): number => {
  const index = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (index === -1) return 0;
  // Words at the start get higher weight (max 1.5, min 1.0)
  return 1.5 - (index / text.length * 0.5);
};

// Helper function to check if a word is part of another matched word
const isSubstringOfMatch = (word: string, matches: string[]): boolean => {
  return matches.some(match => 
    match !== word && match.toLowerCase().includes(word.toLowerCase())
  );
};

export const findBestMatchingCategory = (description: string): CategoryMatch | null => {
  if (!description) return null;
  
  const lowercaseDescription = description.toLowerCase();
  let bestMatch: CategoryMatch | null = null;
  let highestConfidence = 0;
  let matchedKeywords: string[] = [];

  Object.entries(categoryKeywords).forEach(([categoryId, keywords]) => {
    let matchCount = 0;
    let totalWeight = 0;
    let categoryMatches: string[] = [];

    keywords.forEach(keyword => {
      if (lowercaseDescription.includes(keyword.toLowerCase())) {
        // Skip if this keyword is part of an already matched longer keyword
        if (isSubstringOfMatch(keyword, categoryMatches)) {
          return;
        }

        categoryMatches.push(keyword);
        const positionWeight = getPositionWeight(description, keyword);
        // Longer keywords get higher weight
        const lengthWeight = 1 + (keyword.length / 20); // max 2.0 for very long keywords
        
        totalWeight += positionWeight * lengthWeight;
        matchCount++;
      }
    });

    // Calculate confidence score (0 to 1)
    const confidence = matchCount > 0 
      ? (totalWeight / matchCount) * (matchCount / Math.sqrt(keywords.length))
      : 0;

    if (confidence > highestConfidence) {
      bestMatch = { categoryId, confidence };
      highestConfidence = confidence;
      matchedKeywords = categoryMatches;
    }
  });

  // Only return a match if confidence is above threshold
  return bestMatch && bestMatch.confidence >= 0.2 ? bestMatch : null;
};