import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { longUrl } = await req.json()
    
    const shortIoApiKey = Deno.env.get('SHORTIO_API_KEY')
    const shortIoDomain = Deno.env.get('SHORTIO_DOMAIN')

    if (!shortIoApiKey || !shortIoDomain) {
      throw new Error('Missing Short.io configuration')
    }

    const response = await fetch('https://api.short.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': shortIoApiKey,
      },
      body: JSON.stringify({
        domain: shortIoDomain,
        originalURL: longUrl,
      }),
    })

    if (!response.ok) {
      throw new Error(`Short.io API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('URL shortened successfully:', data)

    return new Response(
      JSON.stringify({ shortURL: data.shortURL }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        } 
      }
    )
  } catch (error) {
    console.error('Error shortening URL:', error)
    return new Response(
      JSON.stringify({ error: error.message }), 
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    )
  }
})