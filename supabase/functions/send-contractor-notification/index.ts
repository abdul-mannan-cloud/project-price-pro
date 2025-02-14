
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContractorNotificationRequest {
  customerInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
  };
  estimate: any;
  contractor: any;
  questions: any[];
  answers: any[];
  isTestEstimate?: boolean;
}

function formatQuestionsAndAnswers(questions: any[], answers: any[]): string {
  let html = '<div style="margin: 20px 0;">';
  html += '<h3 style="color: #333;">Customer Responses:</h3>';
  html += '<ul style="list-style-type: none; padding: 0;">';
  
  questions.forEach((q, index) => {
    const answer = answers[index];
    if (q && answer) {
      html += `
        <li style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
          <strong style="color: #444;">Q: ${q.question}</strong><br>
          <span style="color: #666;">A: ${Array.isArray(answer) ? answer.join(', ') : answer}</span>
        </li>
      `;
    }
  });
  
  html += '</ul></div>';
  return html;
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
    const {
      customerInfo,
      estimate,
      contractor,
      questions,
      answers,
      isTestEstimate = false,
    }: ContractorNotificationRequest = await req.json();

    console.log("Processing contractor notification for:", {
      customerInfo,
      contractor,
      isTestEstimate,
    });

    if (!contractor?.contact_email) {
      throw new Error("Contractor email not provided");
    }

    const subject = isTestEstimate 
      ? `[TEST] New Estimate Preview Generated`
      : `New Estimate Request from ${customerInfo.fullName}`;

    const customerDetails = isTestEstimate
      ? `<p style="color: #666;"><strong>Note:</strong> This is a test estimate preview.</p>`
      : `
        <ul style="list-style-type: none; padding: 0;">
          <li><strong>Name:</strong> ${customerInfo.fullName}</li>
          <li><strong>Email:</strong> ${customerInfo.email}</li>
          <li><strong>Phone:</strong> ${customerInfo.phone}</li>
          <li><strong>Address:</strong> ${customerInfo.address}</li>
        </ul>
      `;

    const emailResponse = await resend.emails.send({
      from: "Estimates <onboarding@resend.dev>",
      to: [contractor.contact_email],
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">${subject}</h2>
          
          <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
            <h3 style="color: #444;">Details:</h3>
            ${customerDetails}
          </div>

          ${formatQuestionsAndAnswers(questions, answers)}

          <div style="margin: 20px 0;">
            <h3 style="color: #333;">Estimate Details:</h3>
            <p><strong>Total Estimated Cost:</strong> ${formatCurrency(estimate.totalCost || 0)}</p>
          </div>

          <p style="color: #666; font-size: 14px;">
            ${isTestEstimate 
              ? 'This is a test estimate preview. No customer information is attached.' 
              : 'This is an automated notification. Please log in to your dashboard to view the full estimate details and take action.'}
          </p>
        </body>
        </html>
      `,
    });

    console.log("Contractor notification sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-contractor-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
