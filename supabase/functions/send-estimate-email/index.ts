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
  contractorName: string;
  contractorPhone: string;
  customerEmail: string;
  customerName: string;
  estimateData: any;
  estimateUrl: string;
  pdfBase64?: string;
  businessName: string;
  isTestEstimate?: boolean;
}

interface EstimateItem {
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function generateEstimateItemsHtml(estimateData: any): string {
  let html = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <tr style="background-color: #f2f2f2;">
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Item</th>
        <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Description</th>
        <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">Qty</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Unit Price</th>
        <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total</th>
      </tr>
  `;

  // Iterate through groups
  estimateData.groups.forEach((group: any) => {
    // Iterate through subgroups
    group.subgroups.forEach((subgroup: any) => {
      // Iterate through items
      subgroup.items.forEach((item: any) => {
        html += `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.title}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.description}</td>
            <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.unitAmount)}</td>
            <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.totalPrice)}</td>
          </tr>
        `;
      });
    });
  });

  html += `</table>`;
  return html;
}

function base64ToUint8Array(base64: string): Uint8Array {
  // Remove data URI prefix if present using regex
  const base64Data = base64.replace(/^data:.*;base64,/, '');

  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      estimateId,
      contractorEmail,
      contractorName,
      contractorPhone,
      customerEmail,
      customerName,
      estimateData,
      estimateUrl,
      pdfBase64,
      businessName,
      isTestEstimate = false
    }: EmailRequest = await req.json();

    console.log('Sending estimate email to customer:', {
      estimateId,
      customerEmail,
      customerName,
      estimateUrl,
      isTestEstimate
    });

    const subject = isTestEstimate
        ? `[TEST] Estimate from ${businessName}`
        : `Estimate from ${businessName}`;

    // Prepare attachments
    const attachments = [];
    if (pdfBase64) {
      try {
        const base64Data = pdfBase64.replace(/^data:.*;base64,/, '');

        attachments.push({
          filename: `Estimate_${estimateId}.pdf`,
          content: base64Data,
          type: 'application/pdf',  // Specify the MIME type
          disposition: 'attachment'
        });
      } catch (error) {
        console.error("Error processing PDF base64:", error);
      }
    }

    const emailResponse = await resend.emails.send({
      from: `${businessName} <${businessName}@estimatrix.io>`,
      to: customerEmail,
      subject: subject,
      attachments: attachments,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 650px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #4F46E5; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px;
              margin: 20px 0;
              font-weight: bold;
            }
            .estimate-details {
              background: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .contractor-info {
              background: #f1f5fb;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #eee;
              font-size: 0.9em;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${isTestEstimate ? '[TEST] ' : ''}Estimate from ${businessName}</h1>
            <p>Dear ${customerName},</p>
            <p>Thank you for your interest in our services. Please find your estimate details below:</p>
            
            <div class="estimate-details">
              <h2>Estimate Summary</h2>
              <p>Estimate ID: ${estimateId}</p>
              <p>Total Amount: ${formatCurrency(estimateData.totalCost)}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              
              <h3>Estimate Items</h3>
${generateEstimateItemsHtml(estimateData)}
            </div>

            <div class="contractor-info">
              <h3>Contractor Information</h3>
              <p><strong>Name:</strong> ${contractorName}</p>
              <p><strong>Email:</strong> ${contractorEmail}</p>
              <p><strong>Phone:</strong> ${contractorPhone}</p>
            </div>

            <p>You can view and respond to this estimate online by clicking the button below:</p>
            <a href="${estimateUrl}" class="
                background-color: #4F46E5;
                color: white;
                text-decoration: none;
                border-radius: 6px;
            ">View Estimate</a>
            
            <p>A PDF copy of this estimate is also attached to this email for your records.</p>
            
            <p>If you have any questions or would like to discuss this estimate further, please don't hesitate to contact us.</p>

            <p>Best regards,<br>${businessName}</p>
            
            <div class="footer">
              ${isTestEstimate
          ? '<p><em>Note: This is a test estimate sent for demonstration purposes only.</em></p>'
          : ''}
              <p>This estimate was sent via Estimatrix - Professional Estimation Software</p>
            </div>
          </div>
        </body>
        </html>
      `
    });

    console.log("Email sent successfully to customer:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-customer-estimate-email function:", error);
    return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
    );
  }
});