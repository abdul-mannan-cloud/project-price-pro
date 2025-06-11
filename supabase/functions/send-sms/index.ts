import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SMSRequest {
  type: 'new_opportunity' | 'customer_signed' | 'contractor_signed' | 'estimate_sent';
  phone: string;
  data: {
    // Common fields
    clientName?: string;
    clientPhone?: string;
    clientFirstName?: string;
    address?: string;
    projectTitle?: string;
    totalEstimate?: string;
    businessName?: string;
    businessOwnerFullName?: string;
    businessEmail?: string;
    businessPhone?: string;
    leadPageUrl?: string;
    estimatePageUrl?: string;
    
    // New opportunity specific
    availableAppointments?: string;
    estimateCategories?: Array<{
      category: string;
      amount: string;
    }>;
    aiDescription?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// SMS Templates
const SMS_TEMPLATES = {
  new_opportunity: `New {totalEstimate} opportunity!
{clientName}
{clientPhone}
{address}
{availableAppointments}
Scope of work:
{estimateCategories}
{aiDescription}
{leadPageUrl}`,

  customer_signed: `{clientFirstName} has signed for the {projectTitle} project totaling {totalEstimate}.
Please review and countersign here: {leadPageUrl}`,

  contractor_signed: `{businessName} has countersigned the estimate for {projectTitle}.
To view, save, or print the signed agreement, visit: {estimatePageUrl}
{businessOwnerFullName}
{businessEmail}
{businessPhone}
This is an automated message. Replies are not monitored.`,

  estimate_sent: 
`{businessName} has prepared an estimate for your review: {estimatePageUrl}

If you have any questions, feel free to contact {businessOwnerFullName} at {businessPhone} or {businessEmail}.

This is an automated message. Replies are not monitored.`
};

function formatEstimateCategories(categories: Array<{category: string; amount: string}>): string {
  if (!categories || categories.length === 0) return '';
  
  return categories
    .map(cat => `${cat.category}: ${cat.amount}`)
    .join('\n');
}

function formatAvailableAppointments(appointments: string): string {
  if (!appointments) return '';
  return `Available appointment dates & times:\n${appointments}`;
}

function replacePlaceholders(template: string, data: SMSRequest['data']): string {
  let message = template;
  
  // Replace all placeholders
  const replacements: Record<string, string> = {
    '{totalEstimate}': data.totalEstimate || 'N/A',
    '{clientName}': data.clientName || 'N/A',
    '{clientPhone}': data.clientPhone || 'N/A',
    '{clientFirstName}': data.clientFirstName || 'Customer',
    '{address}': data.address || 'Address not provided',
    '{projectTitle}': data.projectTitle || 'Project',
    '{businessName}': data.businessName || 'Your Contractor',
    '{businessOwnerFullName}': data.businessOwnerFullName || 'Your Contractor',
    '{businessEmail}': data.businessEmail || 'N/A',
    '{businessPhone}': data.businessPhone || 'N/A',
    '{leadPageUrl}': data.leadPageUrl || '',
    '{estimatePageUrl}': data.estimatePageUrl || '',
    '{aiDescription}': data.aiDescription || '',
    '{availableAppointments}': formatAvailableAppointments(data.availableAppointments || ''),
    '{estimateCategories}': formatEstimateCategories(data.estimateCategories || [])
  };

  // Replace all placeholders in the message
  Object.entries(replacements).forEach(([placeholder, value]) => {
    message = message.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  // Clean up any extra whitespace or empty lines
  message = message
    .split('\n')
    .map(line => line.trim())
   // .filter(line => line.length > 0)
    .join('\n');

  return message;
}

function validateRequest(requestData: SMSRequest): string | null {
  const { type, phone, data } = requestData;

  if (!type || !SMS_TEMPLATES[type]) {
    return 'Invalid SMS type. Must be one of: new_opportunity, customer_signed, contractor_signed, estimate_sent';
  }

  if (!phone) {
    return 'Phone number is required';
  }

  if (!data) {
    return 'Data object is required';
  }

  // Type-specific validation
  switch (type) {
    case 'new_opportunity':
      if (!data.clientName || !data.totalEstimate || !data.leadPageUrl) {
        return 'new_opportunity requires: clientName, totalEstimate, leadPageUrl';
      }
      break;
    
    case 'customer_signed':
      if (!data.clientFirstName || !data.projectTitle || !data.totalEstimate || !data.leadPageUrl) {
        return 'customer_signed requires: clientFirstName, projectTitle, totalEstimate, leadPageUrl';
      }
      break;
    
    case 'contractor_signed':
      if (!data.businessName || !data.projectTitle || !data.estimatePageUrl) {
        return 'contractor_signed requires: businessName, projectTitle, estimatePageUrl';
      }
      break;
    
    case 'estimate_sent':
      if (!data.businessName || !data.estimatePageUrl) {
        return 'estimate_sent requires: businessName, estimatePageUrl';
      }
      break;
  }

  return null;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const TELNYX_API_KEY = Deno.env.get('TELNYX_API_KEY');
    const FROM_PHONE_NUMBER = Deno.env.get('TELNYX_PHONE_NUMBER');

    if (!TELNYX_API_KEY || !FROM_PHONE_NUMBER) {
      console.error('Missing environment variables:', { 
        hasTelnyxKey: !!TELNYX_API_KEY, 
        hasFromPhone: !!FROM_PHONE_NUMBER 
      });
      throw new Error('TELNYX_API_KEY or TELNYX_PHONE_NUMBER is not configured in environment variables');
    }

    // Parse request body
    let requestData: SMSRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Invalid JSON in request body');
    }
    
    // Validate the request
    const validationError = validateRequest(requestData);
    if (validationError) {
      console.error('Validation error:', validationError);
      return new Response(JSON.stringify({
        success: false,
        error: validationError
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const { type, phone, data } = requestData;

    // Get the appropriate template and replace placeholders
    const template = SMS_TEMPLATES[type];
    const message = replacePlaceholders(template, data);

    // Format phone number - ensure it has country code
    let formattedPhone = phone.replace(/\D/g, ''); // Remove all non-digits
    if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
      formattedPhone = '1' + formattedPhone; // Add US country code if missing
    }
    formattedPhone = '+' + formattedPhone; // Add + prefix
    
    console.log(`Sending ${type} SMS to: ${formattedPhone}`);
console.log(message);

    // Send SMS via Telnyx API
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_PHONE_NUMBER,
        to: formattedPhone,
        text: message,
        type: 'SMS'
      })
    });

    const responseData = await telnyxResponse.json();

    if (!telnyxResponse.ok) {
      console.error('Telnyx API error:', {
        status: telnyxResponse.status,
        statusText: telnyxResponse.statusText,
        response: responseData
      });
      throw new Error(`Telnyx API error: ${telnyxResponse.status} ${telnyxResponse.statusText} - ${JSON.stringify(responseData)}`);
    }

    console.log('SMS sent successfully:', {
      messageId: responseData.data?.id,
      to: formattedPhone,
      type: type
    });

    return new Response(JSON.stringify({
      success: true,
      message: `${type} SMS sent successfully`,
      messageId: responseData.data?.id,
      sentMessage: message,
      to: formattedPhone,
      details: responseData.data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in SMS function:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : String(error);

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      details: errorStack
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
