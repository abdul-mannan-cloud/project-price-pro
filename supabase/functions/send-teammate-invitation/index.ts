
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
      throw new Error('Missing required fields')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set')
      throw new Error('Email service configuration error')
    }

    const resend = new Resend(resendApiKey)

    // Generate a signup link that includes the team invitation data
    const signupUrl = new URL(`${req.headers.get('origin')}/signup`)
    signupUrl.searchParams.set('invited_by', contractorId)
    signupUrl.searchParams.set('email', email)

    console.log('Sending invitation email to:', email)
    console.log('Signup URL:', signupUrl.toString())

    const emailResponse = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `You've been invited to join ${businessName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Team Invitation</h2>
          <p>You've been invited to join ${businessName} as a team member.</p>
          <p>Click the button below to create your account and accept the invitation:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${signupUrl.toString()}" 
               style="background-color: #6366F1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">This invitation was sent from ${businessName}</p>
        </div>
      `
    })

    console.log('Email sent successfully:', emailResponse)

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

