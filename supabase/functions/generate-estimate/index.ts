import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  projectDescription: string;
  imageUrls?: string[];
  answers: Record<string, any>;
  contractorId?: string;
  leadId?: string;
  category?: string;
}

interface LineItem {
  title: string;
  description: string;
  qty: number;
  unitprice: number;
}

interface Subcategory {
  subcategoryTitle: string;
  lineItems: LineItem[];
}

interface Category {
  category: string;
  subcategories: Subcategory[];
}

interface EstimateOutput {
  projectTitle: string;
  projectDescription: string;
  categories: Category[];
}

function generateProjectTitle(category: string, answers: Record<string, any>): string {
  const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
  return `${categoryName} Project`;
}

function generateProjectDescription(category: string, answers: Record<string, any>, description: string): string {
  return `This project covers the full scope of ${category.toLowerCase()}. ${description} Each phase is broken down into specific tasks and costed accordingly.`;
}

function determineUnit(workType: string): string {
  const unitMap: Record<string, string> = {
    flooring: 'SF',
    painting: 'SF',
    electrical: 'EA',
    plumbing: 'EA',
    carpentry: 'LF',
    demolition: 'SF',
    installation: 'EA',
    labor: 'HR',
    materials: 'EA'
  };

  return unitMap[workType.toLowerCase()] || 'EA';
}

function generateLineItems(answer: any, workType: string): LineItem[] {
  const unit = determineUnit(workType);
  const { question, answers: selectedAnswers, options } = answer;

  return selectedAnswers.map((selected: string) => {
    const option = options.find((opt: any) => opt.value === selected);
    if (!option) return null;

    return {
      title: `${option.label} (${unit})`,
      description: `${option.label} - ${workType} - Material + Labor`,
      qty: Math.ceil(Math.random() * 100), // This should be calculated based on actual requirements
      unitprice: Math.ceil(Math.random() * 100) // This should use actual pricing data
    };
  }).filter(Boolean);
}

function generateEstimate(
  category: string,
  answers: Record<string, any>,
  projectDescription: string
): EstimateOutput {
  const categories: Category[] = [];
  
  // Process each category's answers
  Object.entries(answers).forEach(([categoryKey, categoryAnswers]) => {
    const subcategories: Subcategory[] = [];
    const groupedAnswers = new Map<string, any[]>();

    // Group answers by type
    Object.entries(categoryAnswers).forEach(([_, answer]) => {
      const type = answer.type || 'general';
      if (!groupedAnswers.has(type)) {
        groupedAnswers.set(type, []);
      }
      groupedAnswers.get(type)?.push(answer);
    });

    // Generate subcategories based on answer types
    groupedAnswers.forEach((answers, type) => {
      const subcategory: Subcategory = {
        subcategoryTitle: type.charAt(0).toUpperCase() + type.slice(1),
        lineItems: []
      };

      answers.forEach(answer => {
        const items = generateLineItems(answer, type);
        subcategory.lineItems.push(...items);
      });

      if (subcategory.lineItems.length > 0) {
        subcategories.push(subcategory);
      }
    });

    if (subcategories.length > 0) {
      categories.push({
        category: categoryKey,
        subcategories
      });
    }
  });

  return {
    projectTitle: generateProjectTitle(category, answers),
    projectDescription: generateProjectDescription(category, answers, projectDescription),
    categories
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectDescription, answers, category } = await req.json() as RequestBody;
    console.log('Generating estimate for:', { projectDescription, category });

    const estimate = generateEstimate(category || 'Project', answers, projectDescription);

    return new Response(
      JSON.stringify(estimate),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  } catch (error) {
    console.error('Error generating estimate:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate estimate',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    );
  }
});