import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed')
    }

    const body = await req.json()
    const { 
      event,
      questionId,
      questionOrder,
      question,
      next_question,
      next_if_no,
      is_branching,
      multi_choice,
      category,
      selectedOptions,
      selectedLabel,
      nextQuestionIndex,
      nextQuestionOrder
    } = body

    console.log('Question Flow Event:', {
      timestamp: new Date().toISOString(),
      event,
      question: {
        id: questionId,
        order: questionOrder,
        text: question,
        next_question,
        next_if_no,
        is_branching,
        multi_choice
      },
      category,
      selectedOptions,
      selectedLabel,
      navigation: {
        nextQuestionIndex,
        nextQuestionOrder
      }
    })

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error logging question flow:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
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