import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.3.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { card, customerId, billing_details } = await req.json()

    if (!card || !customerId) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // 1. Create payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card,
      billing_details: billing_details || {},
    })

    // 2. Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customerId,
    })

    // 3. Set as default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    })

    return new Response(JSON.stringify({ success: true, paymentMethodId: paymentMethod.id }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (error) {
    console.error('[Stripe Error]', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
