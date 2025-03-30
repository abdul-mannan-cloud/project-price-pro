import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Initialize Resend with API key
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY environment variable is not set");
    Deno.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

// CORS headers
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
};

// Type Definitions
interface EstimateItem {
    title: string;
    description: string;
    quantity: number;
    unitAmount: number;
    totalPrice: number;
}

interface Subgroup {
    name: string;
    items: EstimateItem[];
}

interface Group {
    name: string;
    subgroups: Subgroup[];
}

interface EstimateData {
    totalCost: number;
    groups: Group[];
    [key: string]: any;
}

interface CustomerInfo {
    fullName: string;
    email: string;
    phone: string;
    address: string;
}

interface ContractorInfo {
    businessName: string;
    name: string;
    email: string;
    phone: string;
}

interface SignedEstimateRequest {
    estimateId: string;
    estimateUrl: string;
    estimateData: EstimateData;
    customerInfo: CustomerInfo;
    contractorInfo: ContractorInfo;
    signatureDate: string;
    pdfBase64?: string;
    isTest?: boolean;
}

/**
 * Formats a number as USD currency
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

/**
 * Converts base64 string to Uint8Array for PDF attachment
 * @param base64 - Base64 encoded string
 * @returns Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
    // Remove data URI prefix if present
    const base64Data = base64.startsWith('data:application/pdf;base64,')
        ? base64.split(',')[1]
        : base64;

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Generate HTML table for estimate items
 * @param estimateData - Estimate data object
 * @returns HTML string
 */
function generateEstimateItemsHtml(estimateData: EstimateData): string {
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
    estimateData.groups.forEach((group) => {
        // Add group name if needed
        if (estimateData.groups.length > 1) {
            html += `
        <tr>
          <td colspan="5" style="padding: 10px; background-color: #f9f9f9; font-weight: bold; border: 1px solid #ddd;">
            ${group.name}
          </td>
        </tr>
      `;
        }

        // Iterate through subgroups
        group.subgroups.forEach((subgroup) => {
            // Add subgroup name if needed
            if (group.subgroups.length > 1) {
                html += `
          <tr>
            <td colspan="5" style="padding: 10px; background-color: #f5f5f5; font-style: italic; border: 1px solid #ddd;">
              ${subgroup.name}
            </td>
          </tr>
        `;
            }

            // Iterate through items
            subgroup.items.forEach((item) => {
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

    // Add total row
    html += `
    <tr style="background-color: #f2f2f2; font-weight: bold;">
      <td colspan="4" style="padding: 10px; text-align: right; border: 1px solid #ddd;">Total:</td>
      <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">${formatCurrency(estimateData.totalCost)}</td>
    </tr>
  `;

    html += `</table>`;
    return html;
}

/**
 * Generate customer confirmation email HTML
 * @param params - Email parameters
 * @returns HTML string
 */
function generateCustomerEmail(params: {
    estimateId: string;
    customerName: string;
    contractorName: string;
    businessName: string;
    signatureDate: string;
    estimateData: EstimateData;
    isTest: boolean;
}): string {
    const {
        estimateId,
        customerName,
        contractorName,
        businessName,
        signatureDate,
        estimateData,
        isTest
    } = params;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${isTest ? '[TEST] ' : ''}Estimate Signed Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; }
        .header { margin-bottom: 30px; }
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
        .confirmation-box {
          background: #e6f7e6;
          border: 1px solid #c3e6c3;
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
        <div class="header">
          <h1>${isTest ? '[TEST] ' : ''}Estimate Signed Confirmation</h1>
        </div>
        
        <p>Dear ${customerName},</p>
        
        <div class="confirmation-box">
          <h3>✅ Signature Confirmation</h3>
          <p>Thank you for signing the estimate on ${signatureDate}. Your signature has been recorded and the estimate is now pending countersignature from ${businessName}.</p>
        </div>
        
        <div class="estimate-details">
          <h2>Estimate Summary</h2>
          <p><strong>Estimate ID:</strong> ${estimateId}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(estimateData.totalCost)}</p>
          <p><strong>Date Signed:</strong> ${signatureDate}</p>
          
          <h3>Estimate Items</h3>
          ${generateEstimateItemsHtml(estimateData)}
        </div>

        <p>What happens next:</p>
        <ol>
          <li>${contractorName} will review and countersign the estimate</li>
          <li>You'll receive a final confirmation when the contract is fully executed</li>
          <li>${contractorName} will contact you to coordinate the next steps</li>
        </ol>
        
        <p>If you have any questions in the meantime, please don't hesitate to contact ${contractorName}.</p>

        <p>Thank you for your business!</p>
        
        <div class="footer">
          ${isTest ? '<p><em>Note: This is a test email sent for demonstration purposes only.</em></p>' : ''}
          <p>This confirmation was sent via Estimatrix - Professional Estimation Software</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate contractor notification email HTML
 * @param params - Email parameters
 * @returns HTML string
 */
function generateContractorEmail(params: {
    estimateId: string;
    estimateUrl: string;
    customerName: string;
    customerInfo: CustomerInfo;
    businessName: string;
    estimateData: EstimateData;
    signatureDate: string;
    isTest: boolean;
}): string {
    const {
        estimateId,
        estimateUrl,
        customerName,
        customerInfo,
        businessName,
        estimateData,
        signatureDate,
        isTest
    } = params;

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${isTest ? '[TEST] ' : ''}Estimate Signed - Action Required</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; }
        .header { margin-bottom: 30px; }
        .notification-box {
          background: #f0f7ff;
          border: 1px solid #b3d7ff;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .customer-info {
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .estimate-details {
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .action-button { 
          display: inline-block; 
          padding: 12px 24px; 
          background-color: #4F46E5; 
          color: white; 
          text-decoration: none; 
          border-radius: 6px;
          margin: 20px 0;
          font-weight: bold;
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
        <div class="header">
          <h1>${isTest ? '[TEST] ' : ''}🎉 Estimate Signed - Action Required</h1>
        </div>
        
        <div class="notification-box">
          <h3>Good news!</h3>
          <p><strong>${customerName}</strong> has signed your estimate for ${formatCurrency(estimateData.totalCost)} on ${signatureDate}.</p>
          <p>You need to review and countersign the estimate to complete the contract.</p>
        </div>
        
        <div class="customer-info">
          <h3>Customer Information</h3>
          <p><strong>Name:</strong> ${customerInfo.fullName}</p>
          <p><strong>Email:</strong> ${customerInfo.email}</p>
          <p><strong>Phone:</strong> ${customerInfo.phone}</p>
          <p><strong>Address:</strong> ${customerInfo.address}</p>
        </div>
        
        <div class="estimate-details">
          <h3>Estimate Summary</h3>
          <p><strong>Estimate ID:</strong> ${estimateId}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(estimateData.totalCost)}</p>
          <p><strong>Date Signed:</strong> ${signatureDate}</p>
        </div>
        
        <p><strong>Action Required:</strong> Please review and countersign the estimate by clicking the button below:</p>
        
        <a href="${estimateUrl}" class="action-button">Review & Countersign</a>
        
        <p>After countersigning, a final confirmation will be sent to both you and the customer.</p>
        
        <div class="footer">
          ${isTest ? '<p><em>Note: This is a test email sent for demonstration purposes only.</em></p>' : ''}
          <p>This notification was sent via Estimatrix - Professional Estimation Software</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req: Request): Promise<Response> => {
    // Handle preflight CORS requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: CORS_HEADERS });
    }

    try {
        const requestData: SignedEstimateRequest = await req.json();
        const {
            estimateId,
            estimateUrl,
            estimateData,
            customerInfo,
            contractorInfo,
            signatureDate,
            pdfBase64,
            isTest = false
        } = requestData;

        console.log("Processing signed estimate notifications for:", {
            estimateId,
            customer: customerInfo.fullName,
            contractor: contractorInfo.businessName,
            isTest
        });

        // Validate required fields
        if (!customerInfo?.email || !contractorInfo?.email) {
            throw new Error("Customer or contractor email not provided");
        }

        // Prepare attachments if PDF is provided
        const attachments = [];
        if (pdfBase64) {
            try {
                attachments.push({
                    filename: `Signed_Estimate_${estimateId}.pdf`,
                    content: base64ToUint8Array(pdfBase64)
                });
            } catch (error) {
                console.error("Error processing PDF base64:", error);
            }
        }

        // 1. Send confirmation email to customer
        const customerEmailSubject = isTest
            ? `[TEST] Confirmation of Your Signed Estimate - ${contractorInfo.businessName}`
            : `Confirmation of Your Signed Estimate - ${contractorInfo.businessName}`;

        const customerEmailResponse = await resend.emails.send({
            from: `${contractorInfo.businessName} <no-reply@estimatrix.io>`,
            to: [customerInfo.email],
            subject: customerEmailSubject,
            attachments: attachments,
            html: generateCustomerEmail({
                estimateId,
                customerName: customerInfo.fullName,
                contractorName: contractorInfo.name,
                businessName: contractorInfo.businessName,
                signatureDate,
                estimateData,
                isTest
            })
        });

        console.log("Customer confirmation email sent successfully:", customerEmailResponse);

        // 2. Send notification email to contractor
        const contractorEmailSubject = isTest
            ? `[TEST] ${customerInfo.fullName} has signed your estimate - Action Required`
            : `${customerInfo.fullName} has signed your estimate - Action Required`;

        const contractorEmailResponse = await resend.emails.send({
            from: `Estimatrix <notifications@estimatrix.io>`,
            to: [contractorInfo.email],
            subject: contractorEmailSubject,
            attachments: attachments,
            html: generateContractorEmail({
                estimateId,
                estimateUrl,
                customerName: customerInfo.fullName,
                customerInfo,
                businessName: contractorInfo.businessName,
                estimateData,
                signatureDate,
                isTest
            })
        });

        console.log("Contractor notification email sent successfully:", contractorEmailResponse);

        return new Response(
            JSON.stringify({
                success: true,
                customerEmail: customerEmailResponse,
                contractorEmail: contractorEmailResponse
            }),
            {
                status: 200,
                headers: CORS_HEADERS,
            }
        );
    } catch (error) {
        console.error("Error in send-signed-estimate-notifications function:", error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error"
            }),
            {
                status: 500,
                headers: CORS_HEADERS,
            }
        );
    }
});