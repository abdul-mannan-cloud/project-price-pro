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
  contractor: {
    business_name: string;
    contact_email: string;
    contact_phone: string;
    business_logo_url?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, estimateData, estimateUrl, contractor }: EmailRequest = await req.json();

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(estimateUrl, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();

    const emailResponse = await resend.emails.send({
      from: `${contractor.business_name} <onboarding@resend.dev>`,
      to: [email],
      subject: `Your Estimate from ${contractor.business_name}`,
      attachments: [
        {
          filename: 'estimate.pdf',
          content: pdf,
        },
      ],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${contractor.business_logo_url ? `
            <img src="${contractor.business_logo_url}" alt="${contractor.business_name} logo" style="max-width: 200px; margin-bottom: 20px;">
          ` : ''}
          
          <p>Hello, ${name}</p>
          
          <p>Thank you for trying out our Quick Quote tool! Attached is a PDF of the estimate.</p>
          
          <p>At ${contractor.business_name}, we take great pride in delivering top-quality work to help you achieve your construction goals.</p>
          
          <p>We'd love the opportunity to turn this quote into a real project for you. Feel free to contact us, and we can start discussing your vision and how we can bring it to life.</p>
          
          <p>You can also view your estimate online at: <a href="${estimateUrl}">${estimateUrl}</a></p>
          
          <p>Looking forward to connecting with you!</p>
          
          <p>Best regards,<br>
          ${contractor.business_name}<br>
          📞 ${contractor.contact_phone}<br>
          ✉️ ${contractor.contact_email}</p>
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