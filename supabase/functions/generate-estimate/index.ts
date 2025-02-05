import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  projectDescription: string;
  imageUrls?: string[];  // Updated to handle multiple images
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

async function fetchAISettings(supabase: any, contractorId: string) {
  // Fetch AI instructions
  const { data: instructions, error: instructionsError } = await supabase
    .from('ai_instructions')
    .select('*')
    .eq('contractor_id', contractorId);

  if (instructionsError) {
    console.error('Error fetching AI instructions:', instructionsError);
  }

  // Fetch AI rates
  const { data: rates, error: ratesError } = await supabase
    .from('ai_rates')
    .select('*')
    .eq('contractor_id', contractorId);

  if (ratesError) {
    console.error('Error fetching AI rates:', ratesError);
  }

  return {
    instructions: instructions || [],
    rates: rates || []
  };
}

function applyAIInstructions(estimate: any, instructions: any[]) {
  instructions.forEach(instruction => {
    // Apply each instruction based on its type or category
    if (instruction.instructions) {
      console.log(`Applying instruction: ${instruction.title}`);
      // Add instruction-specific logic here
      // For example, adjusting costs, adding line items, etc.
    }
  });
  return estimate;
}

function applyAIRates(lineItems: any[], rates: any[]) {
  return lineItems.map(item => {
    const matchingRate = rates.find(rate => {
      // Match rate based on type and unit
      return rate.type === item.type && rate.unit === item.unit;
    });

    if (matchingRate) {
      console.log(`Applying rate: ${matchingRate.title} (${matchingRate.rate} per ${matchingRate.unit})`);
      return {
        ...item,
        unitAmount: matchingRate.rate,
        totalPrice: matchingRate.rate * item.quantity
      };
    }

    return item;
  });
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

function generateLineItems(answer: any, location: LocationData | null, settings: any, aiRates: any[]) {
  const items: any[] = [];
  const { question, answers: selectedAnswers, options, type } = answer;

  // Enhanced base costs with more granular categories
  const baseCosts: Record<string, { labor: number; materials: number }> = {
    'installation': { labor: 85, materials: 150 },
    'repair': { labor: 95, materials: 100 },
    'renovation': { labor: 125, materials: 250 },
    'maintenance': { labor: 75, materials: 50 },
    'custom': { labor: 150, materials: 300 },
    'electrical': { labor: 110, materials: 200 },
    'plumbing': { labor: 120, materials: 180 },
    'carpentry': { labor: 95, materials: 160 },
    'painting': { labor: 65, materials: 90 },
    'flooring': { labor: 85, materials: 200 },
    'demolition': { labor: 70, materials: 50 },
  };

  const complexityMultipliers: Record<string, number> = {
    'simple': 0.8,
    'standard': 1.0,
    'complex': 1.5,
    'custom': 2.0
  };

  selectedAnswers.forEach((selected: string) => {
    const option = options.find((opt: any) => opt.value === selected);
    if (!option) return;

    // Determine work type and complexity from the answer
    const workType = determineWorkType(option.value, question);
    const complexity = determineComplexity(option.value, question);

    const { labor: baseLaborCost, materials: baseMaterialCost } = baseCosts[workType] || baseCosts['custom'];
    const complexityMultiplier = complexityMultipliers[complexity];

    const adjustedLaborCost = adjustPriceForLocation(
      baseLaborCost * complexityMultiplier,
      location,
      settings
    );

    const adjustedMaterialCost = adjustPriceForLocation(
      baseMaterialCost * complexityMultiplier,
      location,
      settings
    );

    const laborHours = Math.max(2, Math.ceil(complexityMultiplier * 3));
    const materialQuantity = Math.max(1, Math.ceil(complexityMultiplier * 2));

    // Generate more descriptive items
    const generatedItems = [];
    
    // Add labor line item with enhanced description
    generatedItems.push({
      title: `${option.label} - Professional Labor`,
      description: generateDescription(workType, option.label, 'labor'),
      quantity: laborHours,
      unit: 'HR',
      type: 'labor',
      unitAmount: adjustedLaborCost,
      totalPrice: adjustedLaborCost * laborHours
    });

    // Add materials line item with enhanced description
    generatedItems.push({
      title: `${option.label} - Materials`,
      description: generateDescription(workType, option.label, 'materials'),
      quantity: materialQuantity,
      unit: 'EA',
      type: 'material',
      unitAmount: adjustedMaterialCost,
      totalPrice: adjustedMaterialCost * materialQuantity
    });

    // Apply AI rates to the generated items
    const itemsWithRates = applyAIRates(generatedItems, aiRates);
    items.push(...itemsWithRates);

    // Add specialized items for custom work
    if (workType === 'custom' || complexity === 'complex') {
      const baseCustomCost = 200 * complexityMultiplier;
      const customWorkCost = adjustPriceForLocation(baseCustomCost, location, settings);
      items.push({
        title: `${option.label} - Design & Planning`,
        description: `Professional design and planning services for ${option.label.toLowerCase()}`,
        quantity: 1,
        unit: 'EA',
        type: 'planning',
        unitAmount: customWorkCost,
        totalPrice: customWorkCost
      });
    }
  });

  return items;
}

function determineWorkType(value: string, question: string): string {
  const combinedText = `${value} ${question}`.toLowerCase();
  
  if (combinedText.includes('electrical')) return 'electrical';
  if (combinedText.includes('plumbing')) return 'plumbing';
  if (combinedText.includes('carpentry')) return 'carpentry';
  if (combinedText.includes('painting')) return 'painting';
  if (combinedText.includes('floor')) return 'flooring';
  if (combinedText.includes('demolition')) return 'demolition';
  if (combinedText.includes('install')) return 'installation';
  if (combinedText.includes('repair')) return 'repair';
  if (combinedText.includes('renovate')) return 'renovation';
  if (combinedText.includes('maintain')) return 'maintenance';
  
  return 'custom';
}

function determineComplexity(value: string, question: string): string {
  const combinedText = `${value} ${question}`.toLowerCase();
  
  if (combinedText.includes('complex') || combinedText.includes('extensive')) return 'complex';
  if (combinedText.includes('custom')) return 'custom';
  if (combinedText.includes('simple') || combinedText.includes('basic')) return 'simple';
  
  return 'standard';
}

function generateDescription(workType: string, itemLabel: string, type: 'labor' | 'materials'): string {
  const baseDescription = type === 'labor' 
    ? 'Professional installation and labor for'
    : 'High-quality materials and supplies for';

  const details = {
    electrical: {
      labor: 'Licensed electrical work including installation, wiring, and safety testing for',
      materials: 'Professional-grade electrical components and materials for'
    },
    plumbing: {
      labor: 'Expert plumbing services including installation, testing, and certification for',
      materials: 'Industry-standard plumbing fixtures and materials for'
    },
    carpentry: {
      labor: 'Skilled carpentry work including custom fitting and finishing for',
      materials: 'Premium wood and carpentry materials for'
    },
    painting: {
      labor: 'Professional painting services including preparation and finishing for',
      materials: 'High-quality paint and painting supplies for'
    },
    flooring: {
      labor: 'Expert flooring installation including subfloor preparation for',
      materials: 'Premium flooring materials and underlayment for'
    },
    demolition: {
      labor: 'Professional demolition services including debris removal for',
      materials: 'Demolition equipment and disposal materials for'
    }
  };

  const description = details[workType as keyof typeof details]?.[type] || baseDescription;
  return `${description} ${itemLabel.toLowerCase()}`;
}

function generateEstimateGroups(answers: Record<string, any>, location: any, settings: any, aiRates: any[]) {
  const groups: any[] = [];
  let totalCost = 0;

  // Process each category's answers
  Object.entries(answers).forEach(([category, categoryAnswers]) => {
    const groupItems: any[] = [];
    
    // Process each question's answers within the category
    Object.entries(categoryAnswers).forEach(([_, answer]) => {
      const items = generateLineItems(answer, location, settings, aiRates);
      groupItems.push(...items);
    });

    if (groupItems.length > 0) {
      const groupTotal = groupItems.reduce((sum, item) => sum + item.totalPrice, 0);
      totalCost += groupTotal;

      groups.push({
        category,
        items: groupItems,
        totalPrice: groupTotal
      });
    }
  });

  return { groups, totalCost };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectDescription, imageUrls, answers, contractorId, leadId, category } = await req.json() as RequestBody;
    console.log('Generating estimate for:', { projectDescription, category, contractorId, imageCount: imageUrls?.length });

    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const locationData = await getLocationData(clientIP);
    console.log('Location data:', locationData);

    let settings = null;
    let aiSettings = { instructions: [], rates: [] };

    if (contractorId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase environment variables');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Fetch contractor settings and AI settings
      const [
        { data: contractor },
        aiSettingsData
      ] = await Promise.all([
        supabase
          .from('contractors')
          .select(`
            *,
            contractor_settings(*)
          `)
          .eq('id', contractorId)
          .single(),
        fetchAISettings(supabase, contractorId)
      ]);

      if (contractor) {
        settings = contractor.contractor_settings;
        aiSettings = aiSettingsData;
        console.log('Contractor settings:', settings);
        console.log('AI settings:', aiSettings);
      }
    }

    const projectSummary = generateProjectSummary(projectDescription, answers, category);
    let { groups, totalCost } = generateEstimateGroups(answers, locationData, settings, aiSettings.rates);

    // Apply AI instructions to modify the estimate
    const estimateWithInstructions = applyAIInstructions({ 
      groups, 
      totalCost,
      projectSummary 
    }, aiSettings.instructions);

    groups = estimateWithInstructions.groups;
    totalCost = estimateWithInstructions.totalCost;

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
