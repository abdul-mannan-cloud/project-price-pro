import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { 
      event,
      currentQuestion,
      selectedOptions,
      selectedLabel,
      nextQuestion,
      timestamp = new Date().toISOString()
    } = await req.json()

    console.log('Question Flow Event:', {
      timestamp,
      event,
      currentQuestion: {
        order: currentQuestion?.order,
        question: currentQuestion?.question,
        next_question: currentQuestion?.next_question,
        next_if_no: currentQuestion?.next_if_no,
        is_branching: currentQuestion?.is_branching,
        multi_choice: currentQuestion?.multi_choice
      },
      selectedOptions,
      selectedLabel,
      nextQuestion: nextQuestion ? {
        order: nextQuestion?.order,
        question: nextQuestion?.question?.substring(0, 30) + '...',
      } : null
    })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error logging question flow:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})