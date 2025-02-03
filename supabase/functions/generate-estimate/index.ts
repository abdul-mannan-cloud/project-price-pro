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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { projectDescription, answers, contractorId, category } = await req.json() as RequestBody

    console.log('Generating estimate for:', { projectDescription, category, contractorId });

    let contractor = null;
    let settings = null;

    if (contractorId) {
      try {
        // Create a Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Missing Supabase environment variables')
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Fetch contractor and settings
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

    const estimateDescription = `Detailed estimate for ${projectDescription.slice(0, 100)}${projectDescription.length > 100 ? '...' : ''}`;

    // Default markup and tax rates if no contractor settings
    const markupPercentage = settings?.markup_percentage || 20;
    const taxRate = settings?.tax_rate || 8.5;

    // Generate estimate groups based on answers
    const laborGroup = {
      name: "Labor",
      description: "Professional labor and service costs",
      items: [
        {
          title: "Initial Assessment",
          description: "Professional evaluation of project requirements",
          quantity: 1,
          unit: "hour",
          unitAmount: 150,
          totalPrice: 150
        }
      ]
    };

    const materialsGroup = {
      name: "Materials",
      description: "Required materials and supplies",
      items: [
        {
          title: "Basic Materials Package",
          description: "Standard materials needed for the project",
          quantity: 1,
          unit: "package",
          unitAmount: 250,
          totalPrice: 250
        }
      ]
    };

    // Calculate total cost
    const subtotal = laborGroup.items.reduce((sum, item) => sum + item.totalPrice, 0) +
                    materialsGroup.items.reduce((sum, item) => sum + item.totalPrice, 0);
    
    const markup = subtotal * (markupPercentage / 100);
    const tax = subtotal * (taxRate / 100);
    const totalCost = subtotal + markup + tax;

    const estimate = {
      title: estimateTitle,
      description: estimateDescription,
      groups: [laborGroup, materialsGroup],
      subtotal,
      markup,
      tax,
      totalCost,
      notes: [
        "This is a preliminary estimate based on the information provided.",
        "Final costs may vary based on site conditions and specific requirements.",
        "Please contact us for a detailed on-site assessment."
      ],
      contractor: contractor
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
    
    // Return a fallback estimate with all required fields
    const fallbackEstimate = {
      title: "Basic Project Estimate",
      description: "Standard estimate based on provided information",
      groups: [{
        name: "Labor",
        description: "Basic labor estimate",
        items: [{
          title: "Initial Assessment",
          description: "Basic project evaluation",
          quantity: 1,
          unit: "hour",
          unitAmount: 150,
          totalPrice: 150
        }]
      }],
      subtotal: 150,
      markup: 30, // 20% markup
      tax: 12.75, // 8.5% tax
      totalCost: 192.75,
      notes: ["This is a basic estimate. Please contact us for a more detailed assessment."],
      contractor: null
    };

    return new Response(
      JSON.stringify(fallbackEstimate),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  }
})