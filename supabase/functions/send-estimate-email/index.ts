import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import * as puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  name: string;
  email: string;
  estimateData: any;
  estimateUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, estimateData, estimateUrl }: EmailRequest = await req.json();

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(estimateUrl, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();

    const emailResponse = await resend.emails.send({
      from: "Estimate <onboarding@resend.dev>",
      to: [email],
      subject: "Your Estimate",
      attachments: [
        {
          filename: 'estimate.pdf',
          content: pdf,
        },
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <p>Hello ${name},</p>
          
          <p>Thank you for your interest! Attached is a PDF of your estimate.</p>
          
          <p>You can also view your estimate online at: <a href="${estimateUrl}">${estimateUrl}</a></p>
          
          <p>Please let us know if you have any questions!</p>
          
          <p>Best regards,<br>
          The Team</p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-estimate-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});