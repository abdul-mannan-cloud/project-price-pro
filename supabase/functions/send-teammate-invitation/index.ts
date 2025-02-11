
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
    console.log('Received invitation request:', { email, contractorId, businessName })

    if (!email || !contractorId || !businessName) {
      console.error('Missing required fields:', { email, contractorId, businessName })
      throw new Error('Missing required fields')
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set')
      throw new Error('Email service configuration error')
    }

    console.log('Initializing Resend client with API key length:', resendApiKey.length)
    const resend = new Resend(resendApiKey)

    // Generate a team onboarding link that includes the invitation data
    const onboardingUrl = new URL(`${req.headers.get('origin')}/team-onboarding`)
    onboardingUrl.searchParams.set('contractor_id', contractorId)
    onboardingUrl.searchParams.set('email', email)

    console.log('Generated onboarding URL:', onboardingUrl.toString())

    console.log('Preparing to send invitation email...')
    const emailResponse = await resend.emails.send({
      from: 'noreply@lovable.dev',
      to: email,
      subject: `Join ${businessName} as a Team Member`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">You're Invited to Join ${businessName}</h2>
          <p>You've been invited to join ${businessName} as a team member. Click the button below to create your account and get started:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${onboardingUrl.toString()}" 
               style="background-color: #6366F1; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation & Create Account
            </a>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #374151;">As a team member, you'll be able to:</p>
            <ul style="color: #4B5563;">
              <li>Access and manage estimates</li>
              <li>View and interact with leads</li>
              <li>Collaborate with your team</li>
            </ul>
          </div>
          
          <p style="color: #6B7280; font-size: 14px;">This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          
          <p style="color: #9CA3AF; font-size: 12px; text-align: center;">
            This invitation was sent from ${businessName}
          </p>
        </div>
      `
    }).catch(error => {
      console.error('Resend API Error:', error)
      throw error
    })

    console.log('Email sent successfully:', emailResponse)

    return new Response(
      JSON.stringify({ message: 'Invitation sent successfully', emailResponse }),
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
