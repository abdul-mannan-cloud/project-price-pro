import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.3.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

serve(async (req: Request) => {
  // CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
      },
    });
  }

  try {
    const { paymentMethodId } = await req.json();

    if (!paymentMethodId) {
      return jsonResponse({ error: "Missing paymentMethodId" }, 400);
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("Stripe error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
});
