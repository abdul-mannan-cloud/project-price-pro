import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced keyword mapping with more specific categories and synonyms
const keywordMap = {
  kitchen: ['kitchen', 'cooking', 'cabinets', 'countertops', 'appliances', 'sink', 'remodel'],
  cabinets: ['cabinet', 'cabinets', 'storage', 'drawers', 'shelves', 'base cabinet', 'upper cabinet'],
  painting: ['paint', 'painting', 'walls', 'ceiling', 'color', 'finish', 'baseboard'],
  flooring: ['floor', 'flooring', 'tile', '12x12', 'hardwood', 'carpet', 'laminate'],
  electrical: ['electrical', 'wiring', 'outlets', 'lights', 'lighting', 'recessed'],
  plumbing: ['plumbing', 'pipes', 'water', 'faucet', 'drain', 'sink'],
  drywall: ['drywall', 'sheetrock', 'wall', 'ceiling', 'texture', 'repair'],
  backsplash: ['backsplash', 'tile', 'mosaic', 'splash', '12"', 'wall tile'],
  countertop: ['countertop', 'counter', 'quartz', 'granite', 'surface'],
  demolition: ['demo', 'demolition', 'remove', 'gut', 'strip'],
  trim: ['trim', 'baseboard', 'molding', 'casing', 'finish']
};

function findKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/[\s,]+/);
  const keywords = new Set<string>();
  
  // First pass: direct word matching
  words.forEach(word => {
    for (const [category, synonyms] of Object.entries(keywordMap)) {
      if (synonyms.some(synonym => word.includes(synonym))) {
        keywords.add(category);
      }
    }
  });
  
  // Second pass: phrase matching
  for (const [category, synonyms] of Object.entries(keywordMap)) {
    if (synonyms.some(synonym => text.toLowerCase().includes(synonym))) {
      keywords.add(category);
    }
  }
  
  return Array.from(keywords);
}

function parseColumn(columnValue: any): any[] {
  if (!columnValue) return [];
  
  let parsed;
  if (typeof columnValue === 'string') {
    try {
      parsed = JSON.parse(columnValue);
    } catch {
      return [];
    }
  } else {
    parsed = columnValue;
  }
  
  return Array.isArray(parsed.data) ? parsed.data : [parsed];
}

function isMatch(taskValue: string, keywords: string[]): boolean {
  const taskLower = taskValue.toLowerCase();
  
  return keywords.some(keyword => {
    // Direct match
    if (taskLower.includes(keyword)) return true;
    
    // Check synonyms
    const synonyms = keywordMap[keyword as keyof typeof keywordMap] || [];
    return synonyms.some(synonym => taskLower.includes(synonym));
  });
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
    let usedTasks = new Set<string>();
    
    if (optionsData.length > 0) {
      const options = optionsData[0];
      
      // Process each question column in sequence
      for (const column of ['Question 1', 'Question 2', 'Question 3', 'Question 4']) {
        const columnData = options[column];
        if (columnData?.data && Array.isArray(columnData.data)) {
          const parsedQuestions = columnData.data;
          console.log(`Processing ${column} with ${parsedQuestions.length} questions`);
          
          // Filter and add questions based on keywords
          parsedQuestions.forEach((q: any, idx: number) => {
            if (!q.task || usedTasks.has(q.task)) return;
            
            const matches = isMatch(q.task, keywords);
            if (matches) {
              usedTasks.add(q.task);
              console.log(`✅ Matched task "${q.task}" in ${column}`);
              
              allQuestions.push({
                stage: questionCount + 1,
                question: q.question,
                options: q.selections.map((label: string, optIdx: number) => ({
                  id: `${column}-${idx}-${optIdx}`,
                  label: String(label)
                })),
                isMultiChoice: q.multi_choice || false
              });
              questionCount++;
            }
          });
        }
      }
    }

    // Sort questions by stage
    allQuestions.sort((a, b) => a.stage - b.stage);
    
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