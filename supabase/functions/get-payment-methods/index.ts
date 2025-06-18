import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"), {
  apiVersion: "2022-11-15",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_id } = await req.json();

    if (!customer_id) {
      return new Response(JSON.stringify({ error: "Missing customer_id" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      });
    }

    // Get customer details
    const customer = await stripe.customers.retrieve(customer_id);

    // Get payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customer_id,
      type: "card",
    });

    return new Response(JSON.stringify({ customer, paymentMethods }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching customer/payment methods:", error);
    return new Response(
      JSON.stringify({
        error: "Unable to retrieve customer or payment methods",
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      },
    );
  }
});
