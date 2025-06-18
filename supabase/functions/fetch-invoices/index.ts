import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const body = await req.json();
    const { customerId, limit = 10, offset = 0 } = body;

    if (!customerId) {
      throw new Error("CustomerId is required");
    }

    // Get invoices for the customer
    const invoicesResponse = await stripe.invoices.list({
      customer: customerId,
      limit: limit,
    });

    // Process each invoice and get its line items - without detailed line items for now
    // to avoid errors
    const invoices = invoicesResponse.data.map((invoice) => {
      return {
        stripe_invoice_id: invoice.id,
        stripe_customer_id: invoice.customer,
        amount_paid: invoice.amount_paid,
        status: invoice.status,
        invoice_pdf: invoice.invoice_pdf,
        invoice_url: invoice.hosted_invoice_url,
        created_at: new Date(invoice.created * 1000).toISOString(),
        description: invoice.description,
        metadata: invoice.metadata,
        paid: invoice.paid,
        // Include the raw lines data from the invoice directly
        line_items: invoice.lines?.data || [],
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        invoices,
        pagination: {
          total: invoices.length,
          limit,
          offset,
        },
      }),
      { headers, status: 200 },
    );
  } catch (error) {
    console.error("Error fetching invoices:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: error.message || "Unknown error occurred",
          type: error.type || "server_error",
        },
      }),
      { headers, status: 400 },
    );
  }
});
