
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, contractorId, businessName } = await req.json()

    if (!email || !contractorId || !businessName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    // Generate a signup link that includes the team invitation data
    const signupUrl = new URL(`${req.headers.get('origin')}/signup`)
    signupUrl.searchParams.set('invited_by', contractorId)
    signupUrl.searchParams.set('email', email)

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `You've been invited to join ${businessName}`,
      html: `
        <p>You've been invited to join ${businessName} as a team member.</p>
        <p>Click the link below to create your account and accept the invitation:</p>
        <p><a href="${signupUrl.toString()}">Accept Invitation</a></p>
        <p>If you didn't expect this invitation, you can ignore this email.</p>
      `
    })

    return new Response(
      JSON.stringify({ message: 'Invitation sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending invitation:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
