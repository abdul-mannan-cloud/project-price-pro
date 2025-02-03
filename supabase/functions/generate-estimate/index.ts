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
  const scope = Object.values(answers).reduce((acc: string[], categoryAnswers: any) => {
    Object.values(categoryAnswers).forEach((answer: any) => {
      if (answer.answers && answer.answers.length > 0) {
        acc.push(answer.answers.join(', '));
      }
    });
    return acc;
  }, []).join('; ');

  return `This ${categoryText} includes ${scope}. ${projectDescription}`;
}

function adjustPriceForLocation(basePrice: number, location: LocationData | null, settings: any): number {
  if (!location) return basePrice;

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

  const regionFactor = regionalFactors[location.region] || 1;
  const contractorPricing = settings?.regional_pricing?.[location.region];
  
  return contractorPricing ? basePrice * contractorPricing : basePrice * regionFactor;
}

function generateEstimateGroups(answers: Record<string, any>, location: LocationData | null, settings: any) {
  const groups: any[] = [];
  let totalCost = 0;

  Object.entries(answers).forEach(([category, categoryAnswers]) => {
    const categoryGroup = {
      name: category.charAt(0).toUpperCase() + category.slice(1),
      description: `Detailed breakdown for ${category} work`,
      items: [] as any[]
    };

    Object.entries(categoryAnswers).forEach(([_, answer]: [string, any]) => {
      const { question, answers: selectedAnswers, options } = answer;

      selectedAnswers.forEach((selected: string) => {
        const option = options.find((opt: any) => opt.value === selected);
        if (option) {
          const laborCost = adjustPriceForLocation(125, location, settings);
          const laborItem = {
            title: `Professional Installation - ${option.label}`,
            description: `Expert labor for ${option.label} installation and setup`,
            quantity: 1,
            unitAmount: laborCost,
            totalPrice: laborCost
          };
          categoryGroup.items.push(laborItem);

          const materialsCost = adjustPriceForLocation(250, location, settings);
          const materialsItem = {
            title: `Materials - ${option.label}`,
            description: `High-quality materials for ${option.label}`,
            quantity: 1,
            unitAmount: materialsCost,
            totalPrice: materialsCost
          };
          categoryGroup.items.push(materialsItem);

          if (option.value.includes('custom')) {
            const customWorkCost = adjustPriceForLocation(200, location, settings);
            const customItem = {
              title: `Custom Work - ${option.label}`,
              description: `Specialized custom work for ${option.label}`,
              quantity: 1,
              unitAmount: customWorkCost,
              totalPrice: customWorkCost
            };
            categoryGroup.items.push(customItem);
          }
        }
      });
    });

    if (categoryGroup.items.length > 0) {
      groups.push(categoryGroup);
      categoryGroup.items.forEach(item => {
        totalCost += item.totalPrice;
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

    let contractor = null;
    let settings = null;

    if (contractorId) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase environment variables')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data, error } = await supabase
          .from('contractors')
          .select(`
            *,
            contractor_settings(*)
          `)
          .eq('id', contractorId)
          .single()

        if (error) {
          console.error('Error fetching contractor:', error)
        } else {
          contractor = data
          settings = data.contractor_settings
        }
      } catch (error) {
        console.error('Error in contractor fetch:', error)
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
      ],
      contractor
    };

    return new Response(
      JSON.stringify(estimate),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  } catch (error) {
    console.error('Error generating estimate:', error)
    
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
    )
  }
})