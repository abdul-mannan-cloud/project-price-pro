import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const { email, name } = await req.json();

    if (!email || !name) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: email or name" }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 400,
        }
      );
    }

    // Create the Stripe Customer
    const customer = await stripe.customers.create({
      email,
      name,
    });

    // Create SetupIntent for that Customer
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: "off_session",
    });

    return new Response(
      JSON.stringify({
        customer,
        clientSecret: setupIntent.client_secret,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error creating customer or setup intent:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create customer or setup intent" }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      }
    );
  }
});
