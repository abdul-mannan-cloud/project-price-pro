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
  userLocation?: {
    city: string;
    state: string;
  };
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

function adjustPriceForLocation(basePrice: number, location: LocationData | null, settings: any): number {
  if (!location) return basePrice;

  // Default regional price adjustments (can be expanded)
  const regionalFactors: Record<string, number> = {
    'CA': 1.4,  // California
    'NY': 1.35, // New York
    'TX': 0.9,  // Texas
    // Add more states as needed
  };

  // Get regional adjustment factor
  const regionFactor = regionalFactors[location.region] || 1;

  // Apply contractor's custom pricing if available
  const contractorPricing = settings?.regional_pricing?.[location.region];
  if (contractorPricing) {
    return basePrice * contractorPricing;
  }

  return basePrice * regionFactor;
}

function generateLineItems(answers: Record<string, any>, location: LocationData | null, settings: any) {
  const groups: any[] = [];
  let totalCost = 0;

  // Process each category of answers
  Object.entries(answers).forEach(([category, categoryAnswers]) => {
    const laborGroup = {
      name: "Labor",
      description: "Professional labor and service costs",
      items: [] as any[]
    };

    const materialsGroup = {
      name: "Materials",
      description: "Required materials and supplies",
      items: [] as any[]
    };

    // Process each question's answer
    Object.entries(categoryAnswers).forEach(([_, answer]: [string, any]) => {
      const { question, answers: selectedAnswers, options } = answer;

      // Generate labor items based on the answer
      const laborItem = {
        title: `Professional ${category} Service`,
        description: `Expert labor for: ${question}`,
        quantity: 1,
        unit: "hours",
        unitAmount: adjustPriceForLocation(125, location, settings),
        totalPrice: 0
      };
      laborItem.totalPrice = laborItem.quantity * laborItem.unitAmount;
      laborGroup.items.push(laborItem);

      // Generate materials items based on selected answers
      selectedAnswers.forEach((selected: string) => {
        const option = options.find((opt: any) => opt.value === selected);
        if (option) {
          const materialItem = {
            title: option.label,
            description: `Materials for: ${option.label}`,
            quantity: 1,
            unit: "unit",
            unitAmount: adjustPriceForLocation(250, location, settings),
            totalPrice: 0
          };
          materialItem.totalPrice = materialItem.quantity * materialItem.unitAmount;
          materialsGroup.items.push(materialItem);
        }
      });
    });

    if (laborGroup.items.length > 0) groups.push(laborGroup);
    if (materialsGroup.items.length > 0) groups.push(materialsGroup);

    // Calculate totals
    groups.forEach(group => {
      group.items.forEach((item: any) => {
        totalCost += item.totalPrice;
      });
    });
  });

  return { groups, totalCost };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectDescription, answers, contractorId, category } = await req.json() as RequestBody

    console.log('Generating estimate for:', { projectDescription, category, contractorId });

    // Get client IP and location data
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

    // Generate estimate title and description
    const estimateTitle = category 
      ? `${category.charAt(0).toUpperCase() + category.slice(1)} Project Estimate`
      : 'Project Estimate';

    // Create a detailed project overview
    const projectOverview = `Detailed estimate for ${projectDescription}. 
    ${locationData ? `Location: ${locationData.city}, ${locationData.region}` : ''}
    This estimate includes both labor and materials needed to complete the project according to the specifications provided.`;

    // Generate detailed line items based on answers
    const { groups, totalCost } = generateLineItems(answers, locationData, settings);

    // Apply contractor settings if available
    const markupPercentage = settings?.markup_percentage || 20;
    const taxRate = settings?.tax_rate || 8.5;
    const markup = totalCost * (markupPercentage / 100);
    const tax = totalCost * (taxRate / 100);
    const finalTotal = totalCost + markup + tax;

    const estimate = {
      title: estimateTitle,
      description: projectOverview,
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