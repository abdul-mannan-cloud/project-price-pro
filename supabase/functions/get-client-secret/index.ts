// supabase/functions/get-client-secret.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Change to your frontend domain for security (e.g., 'https://yourdomain.com')
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    // CORS preflight request
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  try {
    const { customerId } = await req.json()

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Missing customerId' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
    })

    return new Response(
      JSON.stringify({ client_secret: setupIntent.client_secret }),
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error creating SetupIntent:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create SetupIntent' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
