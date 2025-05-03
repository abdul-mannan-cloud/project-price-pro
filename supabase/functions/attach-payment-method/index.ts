// supabase/functions/stripe-create-customer/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

serve(async (req: Request): Promise<Response> => {
  // CORS headers
  const headers: HeadersInit = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    const { name, email, paymentMethod } = await req.json();

    if (!name || !email || !paymentMethod) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Missing required fields',
        }),
        {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 1: Create a Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
    });

    // Step 2: Create a payment method
    const stripePaymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: paymentMethod.card,
      billing_details: paymentMethod.billing_details,
    });

    // Step 3: Attach the payment method to the customer
    await stripe.paymentMethods.attach(stripePaymentMethod.id, {
      customer: customer.id,
    });

    // Step 4: Set as the default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: stripePaymentMethod.id,
      },
    });

    const responseData = {
      success: true,
      message: 'Customer created and payment method attached successfully',
      customerId: customer.id,
      paymentMethodId: stripePaymentMethod.id,
      last4: stripePaymentMethod.card?.last4,
      brand: stripePaymentMethod.card?.brand,
    };

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Stripe error:', error);
    
    let message = 'An error occurred while processing your request';
    let status = 500;
    
    // Handle common Stripe errors
    if (error instanceof Stripe.errors.StripeCardError) {
      message = error.message || 'Your card was declined';
      status = 400;
    } else if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      message = 'Invalid payment information';
      status = 400;
    }
    
    const responseData = {
      success: false,
      message,
      error: error.message,
    };
    
    return new Response(
      JSON.stringify(responseData),
      {
        status,
        headers: { ...headers, 'Content-Type': 'application/json' },
      }
    );
  }
});