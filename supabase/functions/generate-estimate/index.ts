import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  projectDescription: string;
  imageUrl?: string;
  answers: Record<string, any>;
  contractorId?: string;
  leadId?: string;
  category?: string;
}

interface LocationData {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
}

async function getLocationData(ip: string): Promise<LocationData | null> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/?key=AzZ4jUj0F5eFNjhgWgLpikGJxYdf5IzcsfB`);
    if (!response.ok) throw new Error('Failed to fetch location data');
    return await response.json();
  } catch (error) {
    console.error('Error fetching location data:', error);
    return null;
  }
}

function generateProjectSummary(projectDescription: string, answers: Record<string, any>, category?: string): string {
  const categoryText = category ? `${category} project` : 'home improvement project';
  const details = Object.entries(answers).map(([_, categoryAnswers]) => {
    const selections = Object.values(categoryAnswers).map((answer: any) => {
      if (answer.answers && answer.answers.length > 0) {
        const selectedOptions = answer.options
          .filter((opt: any) => answer.answers.includes(opt.value))
          .map((opt: any) => opt.label);
        return `${answer.question}: ${selectedOptions.join(', ')}`;
      }
      return null;
    }).filter(Boolean);
    return selections.join('. ');
  }).join(' ');

  return `This ${categoryText} involves ${details}. ${projectDescription}`;
}

function adjustPriceForLocation(basePrice: number, location: LocationData | null, settings: any): number {
  if (!location) return basePrice;

  // Use contractor settings if available
  if (settings?.regional_pricing?.[location.region]) {
    return basePrice * settings.regional_pricing[location.region];
  }

  // Default regional factors based on cost of living index
  const regionalFactors: Record<string, number> = {
    'CA': 1.4,  // California
    'NY': 1.35, // New York
    'TX': 0.9,  // Texas
    'FL': 1.1,  // Florida
    'IL': 1.2,  // Illinois
    'WA': 1.25, // Washington
    'MA': 1.3,  // Massachusetts
    'OR': 1.2,  // Oregon
    'CO': 1.15, // Colorado
    'AZ': 1.0,  // Arizona
  };

  const factor = regionalFactors[location.region] || 1;
  console.log(`Adjusting price for ${location.region} with factor ${factor}`);
  return basePrice * factor;
}

function generateLineItems(answer: any, location: LocationData | null, settings: any) {
  const items: any[] = [];
  const { question, answers: selectedAnswers, options, type } = answer;

  // Base costs per type of work
  const baseCosts: Record<string, { labor: number; materials: number }> = {
    'installation': { labor: 85, materials: 150 },
    'repair': { labor: 95, materials: 100 },
    'renovation': { labor: 125, materials: 250 },
    'custom': { labor: 150, materials: 300 },
  };

  selectedAnswers.forEach((selected: string) => {
    const option = options.find((opt: any) => opt.value === selected);
    if (!option) return;

    const workType = option.value.includes('custom') ? 'custom' : 
                    option.value.includes('install') ? 'installation' :
                    option.value.includes('repair') ? 'repair' : 'renovation';

    const { labor: baseLaborCost, materials: baseMaterialCost } = baseCosts[workType];

    // Labor costs
    const laborCost = adjustPriceForLocation(baseLaborCost, location, settings);
    const laborHours = Math.ceil(Math.random() * 3) + 2;
    items.push({
      title: `${option.label} Labor (HR)`,
      description: `Expert labor for ${option.label.toLowerCase()}`,
      quantity: laborHours,
      unit: 'HR',
      unitAmount: laborCost,
      totalPrice: laborCost * laborHours
    });

    // Materials costs
    const materialsCost = adjustPriceForLocation(baseMaterialCost, location, settings);
    const materialQuantity = Math.ceil(Math.random() * 2) + 1;
    items.push({
      title: `${option.label} Materials (EA)`,
      description: `High-quality materials and supplies`,
      quantity: materialQuantity,
      unit: 'EA',
      unitAmount: materialsCost,
      totalPrice: materialsCost * materialQuantity
    });

    // Additional costs for custom work
    if (workType === 'custom') {
      const baseCustomCost = 200;
      const customWorkCost = adjustPriceForLocation(baseCustomCost, location, settings);
      items.push({
        title: `${option.label} Design (EA)`,
        description: `Specialized design and planning`,
        quantity: 1,
        unit: 'EA',
        unitAmount: customWorkCost,
        totalPrice: customWorkCost
      });
    }
  });

  return items;
}

function generateEstimateGroups(answers: Record<string, any>, location: LocationData | null, settings: any) {
  const groups: any[] = [];
  let totalCost = 0;

  Object.entries(answers).forEach(([category, categoryAnswers]) => {
    const subgroups = new Map<string, any>();
    
    Object.entries(categoryAnswers).forEach(([questionId, answer]: [string, any]) => {
      const items = generateLineItems(answer, location, settings);
      if (items.length > 0) {
        // Determine subcategory based on the question or selected options
        const subcategory = determineSubcategory(answer);
        
        if (!subgroups.has(subcategory)) {
          subgroups.set(subcategory, {
            name: subcategory,
            items: [],
            subtotal: 0
          });
        }

        const group = subgroups.get(subcategory);
        group.items.push(...items);
        group.subtotal = group.items.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
      }
    });

    if (subgroups.size > 0) {
      const groupSubtotal = Array.from(subgroups.values()).reduce((sum, group) => sum + group.subtotal, 0);
      totalCost += groupSubtotal;

      groups.push({
        name: category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        description: `Complete breakdown for ${category.toLowerCase().replace(/_/g, ' ')} services`,
        subgroups: Array.from(subgroups.values())
      });
    }
  });

  return { groups, totalCost };
}

function determineSubcategory(answer: any): string {
  // Extract keywords from the question and answers to determine appropriate subcategory
  const questionText = answer.question.toLowerCase();
  const selectedOptions = answer.options
    .filter((opt: any) => answer.answers.includes(opt.value))
    .map((opt: any) => opt.label.toLowerCase());

  // Define subcategory mapping based on keywords
  const subcategoryKeywords: Record<string, string[]> = {
    'Electrical': ['electrical', 'wiring', 'lighting', 'outlet'],
    'Plumbing': ['plumbing', 'water', 'pipe', 'drain'],
    'Cabinets': ['cabinet', 'storage', 'drawer'],
    'Countertops': ['countertop', 'surface', 'granite', 'quartz'],
    'Flooring': ['floor', 'tile', 'hardwood', 'carpet'],
    'Walls': ['wall', 'drywall', 'paint', 'texture'],
    'Appliances': ['appliance', 'refrigerator', 'dishwasher', 'oven'],
    'HVAC': ['hvac', 'heating', 'cooling', 'ventilation'],
    'Demolition': ['demolition', 'remove', 'tear out'],
    'Finishing': ['finish', 'trim', 'molding', 'detail']
  };

  // Check question and answers against keywords
  for (const [subcategory, keywords] of Object.entries(subcategoryKeywords)) {
    if (keywords.some(keyword => 
      questionText.includes(keyword) || 
      selectedOptions.some(option => option.includes(keyword))
    )) {
      return subcategory;
    }
  }

  // Default to General if no specific subcategory is found
  return 'General';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectDescription, answers, contractorId, category } = await req.json() as RequestBody;
    console.log('Generating estimate for:', { projectDescription, category, contractorId });

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const locationData = await getLocationData(clientIP);
    console.log('Location data:', locationData);

    let settings = null;
    if (contractorId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: contractor } = await supabase
        .from('contractors')
        .select(`
          *,
          contractor_settings(*)
        `)
        .eq('id', contractorId)
        .single();

      if (contractor) {
        settings = contractor.contractor_settings;
        console.log('Contractor settings:', settings);
      }
    }

    const projectSummary = generateProjectSummary(projectDescription, answers, category);
    const { groups, totalCost } = generateEstimateGroups(answers, locationData, settings);

    // Apply contractor markup and tax if available
    const markupPercentage = settings?.markup_percentage || 20;
    const taxRate = settings?.tax_rate || 8.5;
    const markup = totalCost * (markupPercentage / 100);
    const tax = totalCost * (taxRate / 100);
    const finalTotal = totalCost + markup + tax;

    console.log('Generated estimate:', {
      totalCost,
      markup,
      tax,
      finalTotal,
      groupCount: groups.length
    });

    const estimate = {
      projectSummary,
      groups,
      subtotal: totalCost,
      markup,
      tax,
      totalCost: finalTotal,
      location: locationData ? `${locationData.city}, ${locationData.region}` : undefined,
      notes: [
        "This estimate includes both labor and materials",
        "Final costs may vary based on site conditions and specific requirements",
        `Prices are adjusted based on ${locationData?.city || 'your'} location and market rates`,
        "Contact us for a detailed on-site assessment"
      ]
    };

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
