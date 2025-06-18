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
    const { customerId, amount, description, items = [] } = await req.json();

    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    if (!amount && items.length === 0) {
      throw new Error("Either amount or items are required");
    }

    let invoiceItems: Stripe.InvoiceItem[] = [];

    if (items.length > 0) {
      for (const item of items) {
        const invoiceItem = await stripe.invoiceItems.create({
          customer: customerId,
          amount: item.amount,
          currency: "usd",
          description: item.description,
        });
        invoiceItems.push(invoiceItem);
      }
    } else {
      const invoiceItem = await stripe.invoiceItems.create({
        customer: customerId,
        amount: amount,
        currency: "usd",
        description: description || "Service charge",
      });
      invoiceItems.push(invoiceItem);
    }

    const invoice = await stripe.invoices.create({
      customer: customerId,
      auto_advance: false,
      collection_method: "charge_automatically",
      description: description,
    });

    if (items.length > 0) {
      for (const item of items) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: item.amount,
          currency: "usd",
          description: item.description,
          invoice: invoice.id,
        });
      }
    } else {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: amount,
        currency: "usd",
        description: description || "Service charge",
        invoice: invoice.id,
      });
    }

    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    const paidInvoice = await stripe.invoices.pay(finalizedInvoice.id);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: {
          id: paidInvoice.id,
          status: paidInvoice.status,
          amount_paid: paidInvoice.amount_paid,
          invoice_pdf: paidInvoice.invoice_pdf,
          invoice_url: paidInvoice.hosted_invoice_url,
          created: paidInvoice.created,
        },
      }),
      { headers, status: 200 },
    );
  } catch (error) {
    console.error("Error processing invoice:", error);

    const errorMessage = error.message || "Unknown error occurred";
    const errorType = error.type || "server_error";

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: errorMessage,
          type: errorType,
          code: error.code || "unknown_error",
        },
      }),
      { headers, status: 400 },
    );
  }
});
