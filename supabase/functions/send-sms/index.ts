import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SMSRequest {
  phone: string;
  message: string;
  recipientType?: 'customer' | 'contractor';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from environment variable
    const TELNYX_API_KEY = Deno.env.get('TELNYX_API_KEY');
    if (!TELNYX_API_KEY) {
      throw new Error('TELNYX_API_KEY not configured');
    }

    const FROM_PHONE_NUMBER = Deno.env.get('TELNYX_PHONE_NUMBER');
    if (!FROM_PHONE_NUMBER) {
      throw new Error('TELNYX_PHONE_NUMBER not configured');
    }

    // Parse request body
    const requestData = await req.json();
    const { phone, message, recipientType = 'contractor' } = requestData as SMSRequest;

    console.log('SMS request data:', { phone, messageLength: message?.length, recipientType });

    // Validate required fields
    if (!phone) {
      throw new Error('Phone number is required');
    }
    if (!message) {
      throw new Error('Message text is required');
    }

    // Format phone number to E.164 format if needed
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      // Remove non-digit characters
      const digitsOnly = phone.replace(/\D/g, '');
      
      // If it doesn't have a country code, add +1 (US)
      formattedPhone = `+1${digitsOnly}`;
      
      // Log the formatting
      console.log(`Formatted phone number from ${phone} to ${formattedPhone}`);
    }

    console.log(`Sending SMS to ${recipientType} at ${formattedPhone}`);

    // For testing/development, optionally return success without actually sending
    if (Deno.env.get('SMS_MOCK_MODE') === 'true') {
      console.log('MOCK MODE: Simulating successful SMS send');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'SMS send simulated successfully (MOCK MODE)',
          messageId: 'mock-message-id-' + Date.now(),
          details: { mock: true }
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Call Telnyx API to send SMS
    try {
      const response = await fetch('https://api.telnyx.com/v2/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${TELNYX_API_KEY}`
        },
        body: JSON.stringify({
          from: FROM_PHONE_NUMBER,
          to: formattedPhone,
          text: message
        })
      });

      // Log full API response for debugging
      const responseText = await response.text();
      console.log(`Telnyx API response status: ${response.status}`, responseText);

      // Try to parse response as JSON
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing response as JSON:', e);
        responseData = { error: 'Could not parse response', responseText };
      }

      // Check for errors in the API response
      if (!response.ok) {
        console.error('Telnyx API error:', responseData);
        throw new Error(`Telnyx API error: ${response.status} ${response.statusText}`);
      }

      console.log('SMS sent successfully:', responseData?.data?.id || 'unknown message ID');

      // Return success response
      return new Response(
        JSON.stringify({
          success: true,
          message: 'SMS sent successfully',
          messageId: responseData?.data?.id,
          details: responseData?.data
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (apiError) {
      console.error('Error calling Telnyx API:', apiError);
      throw new Error(`Failed to call Telnyx API: ${apiError.message}`);
    }

  } catch (error) {
    console.error('Error sending SMS:', error);

    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});