import { createClient } from '@redis/client';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const redisClient = createClient({
  username: Deno.env.get('REDIS_USERNAME') || 'default',
  password: Deno.env.get('REDIS_PASSWORD'),
  socket: {
    host: Deno.env.get('REDIS_HOST'),
    port: parseInt(Deno.env.get('REDIS_PORT') || '12923')
  }
});

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    const { action, key, value, ttl } = await req.json();

    switch (action) {
      case 'get':
        const result = await redisClient.get(key);
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'set':
        if (ttl) {
          await redisClient.setEx(key, ttl, value);
        } else {
          await redisClient.set(key, value);
        }
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'delete':
        await redisClient.del(key);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Redis operation failed:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});