import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@4.4.1";

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

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing RESEND_API_KEY" }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      },
    );
  }

  try {
    const { email, firstName, lastName, audienceId } = await req.json();

    const resend = new Resend(RESEND_API_KEY);

    const data = await resend.contacts.create({
      email: email,
      audienceId: "fb260a6d-9665-4655-a4cd-037bc7e2a6d2",
    });

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unhandled exceptionnn",
        message: error.message,
        stack: error.stack,
      }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500,
      },
    );
  }
});
