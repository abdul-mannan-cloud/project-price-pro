import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

// Strong typing for all data structures
interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  available_date?: string;
  available_time?: string;
  flexible?: 'flexible' | 'on_date' | 'before_date';
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY environment variable is not set");
  Deno.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

/**
 * Generates email HTML content
 * @param customerInfo - Customer information
 * @returns HTML string
 */
function generateEmailContent(customerInfo: CustomerInfo): string {
  const subject = "Enterprise Plan Activation Request";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">${subject}</h2>
      
      <div style="margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 8px;">
        <h3 style="color: #444;">Customer Details:</h3>
        <ul style="list-style-type: none; padding: 0;">
          <li><strong>Name:</strong> ${customerInfo.fullName}</li>
          <li><strong>Email:</strong> ${customerInfo.email}</li>
          <li><strong>Phone:</strong> <a href="tel:${customerInfo.phone}" style="color: #1a73e8; text-decoration: none;">${customerInfo.phone}</a></li>
          <li><strong>Address:</strong> ${customerInfo.address}</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        This is an automated notification for an Enterprise Plan activation request.
      </p>
    </body>
    </html>
  `;
}

/**
 * Main request handler
 */
serve(async (req: Request): Promise<Response> => {
  // Handle preflight CORS requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: CORS_HEADERS,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({
      success: false,
      error: "Method not allowed. Only POST requests are accepted."
    }), {
      status: 405,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  }

  try {
    // Parse the request body to get customer info
    const requestData = await req.json();
    const customerInfo: CustomerInfo = requestData.customerInfo;

    if (!customerInfo) {
      throw new Error("customerInfo is required in request body");
    }

    // Validate required fields
    if (!customerInfo.fullName || !customerInfo.email || !customerInfo.phone) {
      throw new Error("fullName, email, and phone are required fields in customerInfo");
    }

    // Generate email content
    const emailContent = generateEmailContent(customerInfo);

    // Send email
    const emailResponse = await resend.emails.send({
      from: "Estimatrix <Opportunity@estimatrix.io>",
      to: ["mkhizerr01@gmail.com"],
      subject: "Enterprise Plan Activation Request",
      html: emailContent,
    });

    console.log("Enterprise plan activation email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Enterprise plan activation request email sent successfully",
      emailId: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in send-contractor-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
        },
      }
    );
  }
});