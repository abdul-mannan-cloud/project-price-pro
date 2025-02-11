import { supabase } from "@/integrations/supabase/client";

type CategoryMatch = {
  categoryId: string;
  confidence: number;
};

const getKeywordsFromOptions = async () => {
  const { data: optionsData } = await supabase
    .from('Options')
    .select('*')
    .eq('Key Options', '42e64c9c-53b2-49bd-ad77-995ecb3106c6')
    .single();

  if (!optionsData) {
    console.error('No options data found');
    return {};
  }

  const keywords: Record<string, string[]> = {};
  
  // Process each category column
  Object.entries(optionsData).forEach(([key, value]) => {
    if (key !== 'Key Options' && value && typeof value === 'object') {
      try {
        const categoryData = value as { keywords?: string[] };
        if (categoryData.keywords) {
          console.log(`Found keywords for category ${key}:`, categoryData.keywords);
          keywords[key] = categoryData.keywords;
        }
      } catch (error) {
        console.error(`Error processing keywords for category ${key}:`, error);
      }
    }
  });

  return keywords;
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

// Helper function to normalize and split text into words
const normalizeText = (text: string): string[] => {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .split(/\s+/); // Split on whitespace
};

export const findBestMatchingCategory = async (description: string): Promise<CategoryMatch | null> => {
  if (!description) return null;
  
  console.log('Processing description:', description);
  const words = normalizeText(description);
  let bestMatch: CategoryMatch | null = null;
  let highestConfidence = 0;

  const categoryKeywords = await getKeywordsFromOptions();
  console.log('Retrieved category keywords:', categoryKeywords);

  Object.entries(categoryKeywords).forEach(([categoryId, keywords]) => {
    let matchCount = 0;
    let totalWeight = 0;
    let categoryMatches: string[] = [];

    keywords.forEach(keyword => {
      // Check for exact matches
      if (description.toLowerCase().includes(keyword.toLowerCase())) {
        if (!isSubstringOfMatch(keyword, categoryMatches)) {
          categoryMatches.push(keyword);
          const positionWeight = getPositionWeight(description, keyword);
          const lengthWeight = 1 + (keyword.length / 20); // max 2.0 for very long keywords
          totalWeight += positionWeight * lengthWeight;
          matchCount++;
        }
      }

      // Check for partial matches in individual words
      const keywordParts = normalizeText(keyword);
      const partialMatches = words.filter(word => 
        keywordParts.some(part => word.includes(part))
      );
      
      if (partialMatches.length > 0) {
        const partialMatchWeight = 0.5 * (partialMatches.length / keywordParts.length);
        totalWeight += partialMatchWeight;
        matchCount += partialMatchWeight;
      }
    });

    // Calculate confidence score (0 to 1)
    const confidence = matchCount > 0 
      ? (totalWeight / matchCount) * (matchCount / Math.sqrt(keywords.length))
      : 0;

    console.log(`Category ${categoryId} confidence:`, confidence);

    if (confidence > highestConfidence) {
      bestMatch = { categoryId, confidence };
      highestConfidence = confidence;
    }
  });

  // Only return a match if confidence is above threshold
  const match = bestMatch && bestMatch.confidence >= 0.2 ? bestMatch : null;
  console.log('Best match found:', match);
  return match;
};