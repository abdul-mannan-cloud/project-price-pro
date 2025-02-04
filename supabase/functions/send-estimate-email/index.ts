import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

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
  contractor?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, estimateData, estimateUrl, contractor }: EmailRequest = await req.json();

    console.log("Starting PDF generation for estimate:", { name, email, estimateUrl });

    // Launch browser with specific args for Deno environment
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ]
    });
    
    console.log("Browser launched successfully");
    
    const page = await browser.newPage();
    await page.goto(estimateUrl, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();
    
    console.log("PDF generated successfully");

    const emailResponse = await resend.emails.send({
      from: contractor?.business_name 
        ? `${contractor.business_name} <onboarding@resend.dev>`
        : "Estimate <onboarding@resend.dev>",
      to: [email],
      subject: "Your Project Estimate",
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
          
          ${contractor ? `
          <p>If you have any questions, please don't hesitate to contact us:</p>
          <ul>
            ${contractor.contact_phone ? `<li>Phone: ${contractor.contact_phone}</li>` : ''}
            ${contractor.contact_email ? `<li>Email: ${contractor.contact_email}</li>` : ''}
          </ul>
          ` : ''}
          
          <p>Best regards,<br>
          ${contractor?.business_name || 'The Team'}</p>
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