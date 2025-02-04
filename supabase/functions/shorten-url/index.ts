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
    console.log('Attempting to shorten URL:', longUrl)
    
    const shortIoApiKey = Deno.env.get('SHORTIO_API_KEY')
    const shortIoDomain = Deno.env.get('SHORTIO_DOMAIN')

    if (!shortIoApiKey || !shortIoDomain) {
      console.error('Missing Short.io configuration:', { 
        hasApiKey: !!shortIoApiKey, 
        hasDomain: !!shortIoDomain 
      })
      throw new Error('Missing Short.io configuration')
    }

    console.log('Making request to Short.io API with domain:', shortIoDomain)

    const response = await fetch('https://api.short.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': shortIoApiKey,
      },
      body: JSON.stringify({
        domain: shortIoDomain,
        originalURL: longUrl,
        title: 'Lovable Estimate Link'
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Short.io API error response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      })
      throw new Error(`Short.io API error: ${response.statusText} (${errorText})`)
    }

    const data = await response.json()
    console.log('URL shortened successfully:', {
      originalUrl: longUrl,
      shortUrl: data.shortURL
    })

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
    console.error('Error in shorten-url function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }), 
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