import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function generateEstimateHtml(data: any, estimateUrl: string, contractor?: any): string {
  console.log('Generating HTML with data:', { data, estimateUrl, contractor });

  if (!data || typeof data !== 'object') {
    console.error('Invalid estimate data:', data);
    throw new Error('Invalid estimate data provided');
  }

  const groups = Array.isArray(data.groups) ? data.groups : [];
  const totalCost = typeof data.totalCost === 'number' ? data.totalCost : 0;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${contractor?.business_logo_url ? 
        `<img src="${contractor.business_logo_url}" alt="${contractor.business_name}" style="max-width: 200px; margin-bottom: 20px;">` 
        : ''}
      
      <h1 style="color: #333; margin-bottom: 30px;">Your Project Estimate</h1>
      
      ${groups.map((group: any) => `
        <div style="margin-bottom: 30px; background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <h2 style="color: #444; margin-top: 0;">${group.name || 'Unnamed Group'}</h2>
          ${group.subgroups?.map((subgroup: any) => `
            <div style="margin-left: 20px; margin-bottom: 20px;">
              <h3 style="color: #666; margin-bottom: 10px;">${subgroup.name || 'Unnamed Subgroup'}</h3>
              ${subgroup.items?.map((item: any) => `
                <div style="margin-bottom: 15px; padding: 10px; background: #fff; border-radius: 4px;">
                  <p style="margin: 5px 0; color: #666;">
                    <strong>${item.title || 'Unnamed Item'}</strong>
                    ${item.description ? `<br><span style="font-size: 14px;">${item.description}</span>` : ''}
                    <br>
                    <span style="color: #0066cc;">
                      ${item.quantity || 0} ${item.unit || 'units'} × ${formatCurrency(item.unitAmount || 0)} = 
                      ${formatCurrency(item.totalPrice || 0)}
                    </span>
                  </p>
                </div>
              `).join('') || 'No items'}
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                <strong>Subtotal: ${formatCurrency(subgroup.subtotal || 0)}</strong>
              </div>
            </div>
          `).join('') || 'No subgroups'}
        </div>
      `).join('')}
      
      <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin-top: 30px;">
        <h2 style="color: #333; margin: 0;">Total Estimated Cost: ${formatCurrency(totalCost)}</h2>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p>You can view your detailed estimate online at: <a href="${estimateUrl}" style="color: #0066cc;">${estimateUrl}</a></p>
        
        ${contractor ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #333;">Contact Information</h3>
            ${contractor.contact_phone ? `<p>Phone: ${contractor.contact_phone}</p>` : ''}
            ${contractor.contact_email ? `<p>Email: ${contractor.contact_email}</p>` : ''}
            ${contractor.business_address ? `<p>Address: ${contractor.business_address}</p>` : ''}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, estimateData, estimateUrl, contractor }: EmailRequest = await req.json();

    console.log("Received request with:", { name, email, estimateUrl });
    console.log("Estimate data:", JSON.stringify(estimateData, null, 2));
    console.log("Contractor info:", contractor);

    if (!estimateData) {
      throw new Error("No estimate data provided");
    }

    if (!email) {
      throw new Error("No email address provided");
    }

    const emailResponse = await resend.emails.send({
      from: contractor?.business_name 
        ? `${contractor.business_name} <onboarding@resend.dev>`
        : "Estimate <onboarding@resend.dev>",
      to: [email],
      subject: "Your Project Estimate",
      html: generateEstimateHtml(estimateData, estimateUrl, contractor),
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
    console.error("Error details:", error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});