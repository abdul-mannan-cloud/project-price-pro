// supabase/functions/sendVerificationEmails/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'
import { Resend } from 'npm:resend'

serve(async (req) => {
  try {
    console.log('Function invoked: sendVerificationEmails')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    )

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

    console.log('Fetching unverified users...')
    const { data: users, error } = await supabase
      .from('contractors')
      .select('contact_email')
      .eq('verified', false)

    if (error) {
      console.error('Error fetching users:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`Found ${users.length} unverified users.`, users)

    for (const user of users) {
      if (!user.contact_email) continue

      console.log(`Sending email to: ${user.contact_email}`)
      await resend.emails.send({
        from: "Estimatrix <Opportunity@estimatrix.io>",
        to: user.contact_email,
        subject: 'Please complete your profile',
        html: `<p>Hello! Please verify your account or complete your profile.</p>`
      })
    }

    return new Response(
      JSON.stringify({ message: 'Emails sent.', count: users.length }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Unexpected server error' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
