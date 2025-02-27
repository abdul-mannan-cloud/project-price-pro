
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  estimateId: string;
  contractorEmail: string;
  estimateData: any;
  estimateUrl: string;
  clientName: string;
  isTestEstimate?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { estimateId, contractorEmail, estimateData, estimateUrl, clientName, isTestEstimate = false }: EmailRequest = await req.json();

    console.log('Sending estimate email to contractor:', {
      estimateId,
      contractorEmail,
      clientName,
      estimateUrl,
      isTestEstimate
    });

    const subject = isTestEstimate 
      ? `[TEST] Estimate Preview Ready`
      : `Estimate Signature Required - Client ${clientName} has signed`;

    const emailResponse = await resend.emails.send({
      from: "Estimate Signature Required <onboarding@resend.dev>",
      to: [contractorEmail],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px;
              margin: 20px 0;
            }
            .estimate-details {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${isTestEstimate ? 'Test Estimate Preview' : 'Estimate Signature Required'}</h1>
            ${isTestEstimate 
              ? '<p>A test estimate preview has been generated.</p>'
              : `<p>${clientName} has signed the estimate and your signature is now required to complete the process.</p>`
            }
            
            <div class="estimate-details">
              <h2>Estimate Summary</h2>
              <p>Total Amount: ${formatCurrency(estimateData.totalCost)}</p>
              ${!isTestEstimate ? `<p>Client: ${clientName}</p>` : ''}
            </div>

            <p>${isTestEstimate 
              ? 'Please review the test estimate by clicking the button below:'
              : 'Please review and sign the estimate by clicking the button below:'
            }</p>
            <a href="${estimateUrl}" class="button">
              ${isTestEstimate ? 'Review Test Estimate' : 'Review and Sign Estimate'}
            </a>
            
            <p>Best regards,<br>Your Estimation System</p>
            ${isTestEstimate 
              ? '<p style="color: #666;"><em>Note: This is a test estimate. No customer information is attached.</em></p>'
              : ''}
          </div>
        </body>
        </html>
      `
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
