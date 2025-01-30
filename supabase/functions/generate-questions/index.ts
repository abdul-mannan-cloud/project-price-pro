import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced keyword mapping with more specific categories and synonyms
const keywordMap = {
  kitchen: ['kitchen', 'cooking', 'cabinets', 'countertops', 'appliances', 'sink', 'remodel'],
  cabinets: ['cabinet', 'cabinets', 'storage', 'drawers', 'shelves', 'base cabinet', 'upper cabinet', 'base and upper'],
  painting: ['paint', 'painting', 'walls', 'ceiling', 'color', 'finish', 'baseboard'],
  flooring: ['floor', 'flooring', 'tile', '12x12', 'hardwood', 'carpet', 'laminate'],
  electrical: ['electrical', 'wiring', 'outlets', 'lights', 'lighting', 'recessed'],
  plumbing: ['plumbing', 'pipes', 'water', 'faucet', 'drain', 'sink'],
  drywall: ['drywall', 'sheetrock', 'wall', 'ceiling', 'texture', 'repair'],
  backsplash: ['backsplash', 'tile', 'mosaic', 'splash', '12"', 'wall tile'],
  countertop: ['countertop', 'counter', 'quartz', 'granite', 'surface'],
  demolition: ['demo', 'demolition', 'remove', 'gut', 'strip'],
  trim: ['trim', 'baseboard', 'molding', 'casing', 'finish'],
  appliances: ['appliance', 'appliances', 'refrigerator', 'stove', 'dishwasher', 'microwave']
};

function findKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywords = new Set<string>();
  
  // First pass: Check for exact category matches
  for (const [category, synonyms] of Object.entries(keywordMap)) {
    if (normalizedText.includes(category.toLowerCase())) {
      keywords.add(category);
      continue;
    }
    
    // Second pass: Check for synonym matches
    for (const synonym of synonyms) {
      if (normalizedText.includes(synonym.toLowerCase())) {
        keywords.add(category);
        break;
      }
    }
  }
  
  return Array.from(keywords);
}

function processQuestionData(columnData: any): any[] {
  if (!columnData) return [];
  
  try {
    // Handle both string and object formats
    const parsed = typeof columnData === 'string' ? JSON.parse(columnData) : columnData;
    return Array.isArray(parsed.data) ? parsed.data : [parsed];
  } catch (error) {
    console.error('Error processing question data:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription } = await req.json();
    console.log('Processing request with description:', projectDescription);

    const keywords = findKeywords(projectDescription);
    console.log('Extracted keywords:', keywords);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Fetch template questions from Options table
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/Options?select=*`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch template questions');
    }

    const optionsData = await optionsResponse.json();
    let allQuestions: any[] = [];
    let questionCount = 0;
    let usedQuestions = new Set<string>();
    
    if (optionsData.length > 0) {
      const options = optionsData[0];
      
      // Process each question column
      for (let i = 1; i <= 4; i++) {
        const columnKey = `Question ${i}`;
        const columnData = options[columnKey];
        
        if (!columnData) {
          console.log(`No data found for ${columnKey}`);
          continue;
        }

        const questions = processQuestionData(columnData);
        console.log(`Processing ${columnKey}:`, questions);

        // Match questions based on keywords
        questions.forEach((q: any) => {
          if (!q.task || !q.question || usedQuestions.has(q.question)) {
            return;
          }

          // Check if the question matches any of our keywords
          const questionMatches = keywords.some(keyword => {
            const synonyms = keywordMap[keyword as keyof typeof keywordMap] || [];
            return synonyms.some(synonym => 
              q.task.toLowerCase().includes(synonym.toLowerCase())
            );
          });

          if (questionMatches) {
            console.log(`✅ Matched question: "${q.question}" for task: "${q.task}"`);
            usedQuestions.add(q.question);
            
            allQuestions.push({
              stage: questionCount + 1,
              question: q.question,
              options: q.selections.map((label: string, optIdx: number) => ({
                id: `${columnKey}-${optIdx}`,
                label: String(label)
              })),
              isMultiChoice: q.multi_choice || false
            });
            questionCount++;
          }
        });
      }
    }

    // Sort questions by stage and ensure we don't exceed 30 questions
    allQuestions.sort((a, b) => a.stage - b.stage);
    allQuestions = allQuestions.slice(0, 30);
    
    console.log(`Returning ${allQuestions.length} questions:`, allQuestions);

    return new Response(JSON.stringify({ 
      questions: allQuestions,
      totalStages: allQuestions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});