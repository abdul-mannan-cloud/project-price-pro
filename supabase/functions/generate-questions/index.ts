import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuestionData {
  task: string;
  question: string;
  multi_choice: boolean;
  selections: string[];
}

// Define keyword synonyms and related terms
const keywordMap = {
  kitchen: ['kitchen', 'cooking', 'cabinets', 'countertops', 'appliances', 'sink'],
  bathroom: ['bathroom', 'bath', 'shower', 'toilet', 'vanity'],
  flooring: ['floor', 'flooring', 'tile', 'hardwood', 'carpet', 'laminate'],
  painting: ['paint', 'painting', 'walls', 'ceiling', 'color'],
  electrical: ['electrical', 'wiring', 'outlets', 'lights', 'lighting'],
  plumbing: ['plumbing', 'pipes', 'water', 'faucet', 'drain'],
  windows: ['window', 'windows', 'glass', 'frame'],
  doors: ['door', 'doors', 'entry', 'doorway'],
  general: ['renovation', 'remodel', 'repair', 'fix', 'upgrade', 'improve']
};

function parseColumn(columnValue: any): QuestionData[] {
  if (!columnValue) return [];

  let parsed;
  if (typeof columnValue === 'string') {
    try {
      parsed = JSON.parse(columnValue);
    } catch {
      parsed = {};
    }
  } else {
    parsed = columnValue;
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }
  
  return [parsed];
}

function findKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/\s+/);
  const keywords = new Set<string>();

  // Check each word against our keyword map
  words.forEach(word => {
    for (const [category, synonyms] of Object.entries(keywordMap)) {
      if (synonyms.some(synonym => word.includes(synonym))) {
        keywords.add(category);
      }
    }
  });

  return Array.from(keywords);
}

function isMatch(taskValue: string, keywords: string[]): boolean {
  const taskLower = taskValue.toLowerCase();
  
  // Check if any of our keywords match the task
  return keywords.some(keyword => {
    // Direct match
    if (taskLower.includes(keyword)) return true;
    
    // Check synonyms
    const synonyms = keywordMap[keyword as keyof typeof keywordMap] || [];
    return synonyms.some(synonym => taskLower.includes(synonym));
  });
}

const defaultQuestions = [
  {
    stage: 1,
    question: "What type of project are you planning?",
    options: [
      { id: "type-1", label: "Kitchen Remodel" },
      { id: "type-2", label: "Bathroom Renovation" },
      { id: "type-3", label: "Flooring Installation" },
      { id: "type-4", label: "Painting" },
      { id: "type-5", label: "General Repairs" },
      { id: "type-6", label: "Multiple Rooms" }
    ],
    isMultiChoice: true
  },
  {
    stage: 2,
    question: "What is the current condition of the space?",
    options: [
      { id: "condition-1", label: "Needs Complete Renovation" },
      { id: "condition-2", label: "Requires Minor Updates" },
      { id: "condition-3", label: "Damaged/Repair Needed" },
      { id: "condition-4", label: "Outdated but Functional" }
    ],
    isMultiChoice: false
  },
  {
    stage: 3,
    question: "What is your estimated timeline for this project?",
    options: [
      { id: "timeline-1", label: "As Soon as Possible" },
      { id: "timeline-2", label: "Within 1-3 Months" },
      { id: "timeline-3", label: "3-6 Months" },
      { id: "timeline-4", label: "6+ Months" }
    ],
    isMultiChoice: false
  },
  {
    stage: 4,
    question: "What is your estimated budget range?",
    options: [
      { id: "budget-1", label: "Under $5,000" },
      { id: "budget-2", label: "$5,000 - $15,000" },
      { id: "budget-3", label: "$15,000 - $30,000" },
      { id: "budget-4", label: "$30,000+" }
    ],
    isMultiChoice: false
  },
  {
    stage: 5,
    question: "Do you need any of these additional services?",
    options: [
      { id: "services-1", label: "Design Consultation" },
      { id: "services-2", label: "Permit Handling" },
      { id: "services-3", label: "Debris Removal" },
      { id: "services-4", label: "Material Selection Help" }
    ],
    isMultiChoice: true
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription } = await req.json();
    console.log('Processing request with description:', projectDescription);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Extract keywords from the project description
    const keywords = findKeywords(projectDescription);
    console.log('Extracted keywords:', keywords);

    // Fetch template questions
    const optionsResponse = await fetch(`${supabaseUrl}/rest/v1/Options?select=*&limit=1`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
      },
    });

    if (!optionsResponse.ok) {
      throw new Error('Failed to fetch template questions');
    }

    const optionsData = await optionsResponse.json();
    let allQuestions = [];
    let questionCount = 0;
    
    if (optionsData.length > 0) {
      const options = optionsData[0];
      
      // Process each question column in sequence
      for (const column of ['Question 1', 'Question 2', 'Question 3', 'Question 4']) {
        try {
          const columnData = options[column];
          if (columnData?.data && Array.isArray(columnData.data)) {
            const parsedQuestions = parseColumn(columnData);
            console.log(`Processing ${column} with ${parsedQuestions.length} questions`);
            
            const matchedQuestions = parsedQuestions.filter(q => {
              const matches = q.task && isMatch(q.task, keywords);
              if (matches) {
                console.log(`✅ Matched task "${q.task}" in ${column}`);
              }
              return matches;
            }).map((questionObj, idx) => ({
              stage: parseInt(column.split(' ')[1]),
              question: questionObj.question,
              options: questionObj.selections.map((label, optIdx) => ({
                id: `${column}-${idx}-${optIdx}`,
                label: String(label)
              })),
              isMultiChoice: questionObj.multi_choice
            }));
            
            // Only add questions if we haven't exceeded the limit
            const remainingSlots = 30 - questionCount;
            const questionsToAdd = matchedQuestions.slice(0, remainingSlots);
            allQuestions.push(...questionsToAdd);
            questionCount += questionsToAdd.length;
            
            if (questionCount >= 30) break;
          }
        } catch (error) {
          console.error(`Error processing ${column}:`, error);
        }
      }
    }

    // If we have room for default questions, add them
    if (questionCount < 30) {
      const remainingSlots = 30 - questionCount;
      const defaultsToAdd = defaultQuestions.slice(0, remainingSlots);
      allQuestions.push(...defaultsToAdd);
    }

    // Generate additional AI questions if we still have room
    if (allQuestions.length < 30) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-ai-questions', {
          body: { 
            projectDescription,
            keywords,
            maxQuestions: 30 - allQuestions.length
          }
        });

        if (!error && data?.questions) {
          allQuestions.push(...data.questions);
        }
      } catch (error) {
        console.error('Error generating AI questions:', error);
      }
    }

    // Sort questions by stage
    allQuestions.sort((a, b) => a.stage - b.stage);

    console.log('Returning questions:', allQuestions);

    return new Response(JSON.stringify({ 
      questions: allQuestions,
      totalStages: allQuestions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-questions function:', error);
    return new Response(JSON.stringify({ 
      questions: defaultQuestions,
      totalStages: defaultQuestions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});