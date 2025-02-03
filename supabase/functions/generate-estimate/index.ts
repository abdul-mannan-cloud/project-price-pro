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
  const details = Object.entries(answers).map(([category, categoryAnswers]) => {
    const selections = Object.values(categoryAnswers).map((answer: any) => {
      if (answer.answers && answer.answers.length > 0) {
        const selectedOptions = answer.options
          .filter((opt: any) => answer.answers.includes(opt.value))
          .map((opt: any) => opt.label);
        return `${answer.question}: ${selectedOptions.join(', ')}`;
      }
      return null;
    }).filter(Boolean);
    return `${category}: ${selections.join('; ')}`;
  }).join('. ');

  return `This ${categoryText} involves ${details}. ${projectDescription}`;
}

function adjustPriceForLocation(basePrice: number, location: LocationData | null, settings: any): number {
  if (!location) return basePrice;

  // Use contractor settings if available
  if (settings?.regional_pricing?.[location.region]) {
    return basePrice * settings.regional_pricing[location.region];
  }

  // Default regional factors
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

  return basePrice * (regionalFactors[location.region] || 1);
}

function generateLineItems(answer: any, location: LocationData | null, settings: any) {
  const items: any[] = [];
  const { question, answers: selectedAnswers, options } = answer;

  selectedAnswers.forEach((selected: string) => {
    const option = options.find((opt: any) => opt.value === selected);
    if (!option) return;

    // Labor costs
    const baseLaborCost = 125;
    const laborCost = adjustPriceForLocation(baseLaborCost, location, settings);
    items.push({
      title: `Professional Installation - ${option.label}`,
      description: `Expert labor for ${option.label} installation and setup`,
      quantity: 1,
      unit: 'hours',
      unitAmount: laborCost,
      totalPrice: laborCost
    });

    // Materials costs
    const baseMaterialCost = 250;
    const materialsCost = adjustPriceForLocation(baseMaterialCost, location, settings);
    items.push({
      title: `Materials - ${option.label}`,
      description: `High-quality materials for ${option.label}`,
      quantity: 1,
      unit: 'set',
      unitAmount: materialsCost,
      totalPrice: materialsCost
    });

    // Additional costs for custom work
    if (option.value.includes('custom')) {
      const baseCustomCost = 200;
      const customWorkCost = adjustPriceForLocation(baseCustomCost, location, settings);
      items.push({
        title: `Custom Work - ${option.label}`,
        description: `Specialized custom work for ${option.label}`,
        quantity: 1,
        unit: 'service',
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
    const subgroups: Record<string, any[]> = {};
    
    Object.entries(categoryAnswers).forEach(([_, answer]: [string, any]) => {
      const items = generateLineItems(answer, location, settings);
      const subgroupKey = answer.question;
      
      if (!subgroups[subgroupKey]) {
        subgroups[subgroupKey] = [];
      }
      subgroups[subgroupKey].push(...items);
    });

    // Create main category group with subgroups
    const categoryGroup = {
      name: category.charAt(0).toUpperCase() + category.slice(1),
      description: `Detailed breakdown for ${category} work`,
      subgroups: Object.entries(subgroups).map(([name, items]) => ({
        name,
        items
      }))
    };

    if (Object.keys(subgroups).length > 0) {
      groups.push(categoryGroup);
      Object.values(subgroups).forEach(items => {
        items.forEach(item => {
          totalCost += item.totalPrice;
        });
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
      }
    }

    const projectSummary = generateProjectSummary(projectDescription, answers, category);
    const { groups, totalCost } = generateEstimateGroups(answers, locationData, settings);

    const markupPercentage = settings?.markup_percentage || 20;
    const taxRate = settings?.tax_rate || 8.5;
    const markup = totalCost * (markupPercentage / 100);
    const tax = totalCost * (taxRate / 100);
    const finalTotal = totalCost + markup + tax;

    const estimate = {
      projectSummary,
      groups,
      subtotal: totalCost,
      markup,
      tax,
      totalCost: finalTotal,
      location: locationData ? `${locationData.city}, ${locationData.region}` : undefined,
      notes: [
        "This estimate includes both labor and materials.",
        "Final costs may vary based on site conditions and specific requirements.",
        "Prices are adjusted based on your location and market rates.",
        "Please contact us for a detailed on-site assessment."
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