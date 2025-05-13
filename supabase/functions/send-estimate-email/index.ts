import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
};

// Update interface to match your actual database schema
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
  signatureType?: 'contractor' | 'client';
  signerInitials?: string;
  clientName?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function generateEstimateItemsHtml(estimateData: any): string {
  // Handle case when groups might not be defined
  if (!estimateData || !estimateData.groups || !Array.isArray(estimateData.groups)) {
    return '<p>No estimate items available</p>';
  }

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
    if (group && group.subgroups && Array.isArray(group.subgroups)) {
      // Iterate through subgroups
      group.subgroups.forEach((subgroup: any) => {
        if (subgroup && subgroup.items && Array.isArray(subgroup.items)) {
          // Iterate through items
          subgroup.items.forEach((item: any) => {
            if (item) {
              html += `
                <tr>
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.title || 'Item'}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${item.description || ''}</td>
                  <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${item.quantity || 0}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.unitAmount || 0)}</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(item.totalPrice || 0)}</td>
                </tr>
              `;
            }
          });
        }
      });
    }
  });

  html += `</table>`;
  return html;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    
    // Destructure with defaults to prevent undefined errors
    const {
      estimateId = '',
      contractorEmail = '',
      contractorName = '',
      contractorPhone = '',
      customerEmail = '',
      customerName = '',
      estimateData = { totalCost: 0, groups: [] },
      estimateUrl = '',
      pdfBase64,
      businessName = 'Business',
      isTestEstimate = false,
      signatureType = '',
      signerInitials = '',
      clientName = ''
    } = requestData;

    console.log('Received request:', {
      estimateId,
      type: signatureType || 'regular',
      businessName,
      recipient: signatureType === 'contractor' ? contractorEmail : customerEmail
    });

    // Ensure totalCost exists and is a number
    const totalCost = estimateData?.totalCost || 0;
    const projectTitle = estimateData?.project_title || 'Project';

    // Determine the email content based on signature type
    let emailSubject = '';
    let emailContent = '';
    let emailRecipient = '';

    if (signatureType === 'contractor') {
      // Email to contractor confirming their signature
      emailSubject = isTestEstimate
        ? `[TEST] You've Signed the Estimate - ${businessName}`
        : `You've Signed the Estimate - ${businessName}`;
      
      emailRecipient = contractorEmail;

      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${emailSubject}</title>
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
            .signature-info {
              background: #e6f7ff;
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
            <h1>${isTestEstimate ? '[TEST] ' : ''}You've Signed the Estimate</h1>
            <p>Dear ${contractorName},</p>
            <p>You have successfully signed the estimate for <strong>${projectTitle}</strong>.</p>
            
            <div class="signature-info">
              <h3>Signature Information</h3>
              <p><strong>Signature:</strong> ${signerInitials}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="estimate-details">
              <h2>Estimate Summary</h2>
              <p>Estimate ID: ${estimateId}</p>
              <p>Total Amount: ${formatCurrency(totalCost)}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              
              <h3>Estimate Items</h3>
              ${generateEstimateItemsHtml(estimateData)}
            </div>

            <p>You can view the complete signed estimate by clicking the button below:</p>
            <a href="${estimateUrl}" style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              font-size: 16px;
              margin-top: 10px;
            ">View Signed Estimate</a>
            
            <p>Thank you for using our service.</p>
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
      `;
    } else if (signatureType === 'client') {
      // Email to contractor about client signature
      emailSubject = isTestEstimate
        ? `[TEST] Client Has Signed Your Estimate - ${businessName}`
        : `Client Has Signed Your Estimate - ${businessName}`;
      
      emailRecipient = contractorEmail;

      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${emailSubject}</title>
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
            .signature-info {
              background: #e6f7ff;
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
            <h1>${isTestEstimate ? '[TEST] ' : ''}Client Has Signed Your Estimate</h1>
            <p>Dear ${contractorName},</p>
            <p>Your client has signed the estimate for <strong>${projectTitle}</strong>.</p>
            
            <div class="signature-info">
              <h3>Client Signature Information</h3>
              <p><strong>Client Name:</strong> ${clientName}</p>
              <p><strong>Signature:</strong> ${signerInitials}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div class="estimate-details">
              <h2>Estimate Summary</h2>
              <p>Estimate ID: ${estimateId}</p>
              <p>Total Amount: ${formatCurrency(totalCost)}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              
              <h3>Estimate Items</h3>
              ${generateEstimateItemsHtml(estimateData)}
            </div>

            <p>You can view the complete signed estimate by clicking the button below:</p>
            <a href="${estimateUrl}" style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              font-size: 16px;
              margin-top: 10px;
            ">View Signed Estimate</a>
            
            <p>Thank you for using our service.</p>
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
      `;
    } else {
      // Default customer email template (original functionality)
      emailSubject = isTestEstimate
        ? `[TEST] Estimate from ${businessName}`
        : `Estimate from ${businessName}`;
      
      emailRecipient = customerEmail;

      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${emailSubject}</title>
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
              <p>Total Amount: ${formatCurrency(totalCost)}</p>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              
              <h3>Estimate Items</h3>
              ${generateEstimateItemsHtml(estimateData)}
            </div>

            <div class="contractor-info">
              <h3>Contractor Information</h3>
              <p><strong>Name:</strong> ${contractorName}</p>
              <p><strong>Email:</strong> ${contractorEmail}</p>
              <p><strong>Phone:</strong> <a href="tel:${contractorPhone}" style="color: #1a73e8; text-decoration: none;">${contractorPhone}</a></p>
            </div>

            <p>You can view and respond to this estimate online by clicking the button below:</p>
            <a href="${estimateUrl}" style="
              display: inline-block;
              padding: 12px 24px;
              background-color: #4F46E5;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: bold;
              font-size: 16px;
              margin-top: 10px;
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
      `;
    }

    console.log(`Sending ${signatureType || 'regular'} signature email to ${emailRecipient}`);

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
      from: `${businessName} <${businessName.replace(/[^a-zA-Z0-9]/g, '')}@estimatrix.io>`,
      to: emailRecipient,
      subject: emailSubject,
      attachments: attachments,
      html: emailContent
    });

    console.log(`Email sent successfully for ${signatureType || 'regular'} signature:`, emailResponse);

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