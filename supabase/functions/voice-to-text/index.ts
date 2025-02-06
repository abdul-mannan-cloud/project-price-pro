
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Since we'll be using the Web Speech API in the frontend,
  // this endpoint is no longer needed but kept for future use
  return new Response(
    JSON.stringify({ message: "Use Web Speech API directly in frontend" }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
