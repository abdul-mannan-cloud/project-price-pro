import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface SMSRequest {
  phone: string;
  message: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELNYX_API_KEY = Deno.env.get('TELNYX_API_KEY');
    const FROM_PHONE_NUMBER = Deno.env.get('TELNYX_PHONE_NUMBER');

    if (!TELNYX_API_KEY || !FROM_PHONE_NUMBER) {
      throw new Error('TELNYX_API_KEY or TELNYX_PHONE_NUMBER is not configured in environment variables');
    }

    const requestData: SMSRequest = await req.json();
    const { phone, message } = requestData;

    if (!phone || !message) {
      throw new Error('Phone number and message are required');
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    console.log(`Sending SMS to: ${formattedPhone}`);

    const response = await fetch('https://api.telnyx.com/v2/messages', {
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

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Telnyx API error:', response.status, response.statusText, responseData);
      throw new Error(`Telnyx error: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`);
    }

    console.log('SMS sent successfully:', responseData.data);

    return new Response(JSON.stringify({
      success: true,
      message: 'SMS sent successfully',
      messageId: responseData.data.id,
      details: responseData.data
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error sending SMS:', error);

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : error
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
