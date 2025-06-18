import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    const body = await req.json();
    const {
      event,
      questionId,
      questionOrder,
      question,
      type,
      selectedValue,
      selectedLabel,
      nextQuestionId,
      category,
      options,
      selectedOption,
      navigationSource,
    } = body;

    // Log the question flow event with enhanced details
    console.log("Question Flow Event:", {
      timestamp: new Date().toISOString(),
      event,
      category,
      question: {
        id: questionId,
        order: questionOrder,
        text: question,
        type,
      },
      selection: {
        value: selectedValue,
        label: selectedLabel,
        option: selectedOption,
      },
      navigation: {
        nextQuestionId,
        source: navigationSource, // 'option_next', 'question_next', or 'sequence_order'
        availableOptions: options?.map((opt: any) => ({
          label: opt.label,
          value: opt.value,
          next: opt.next,
        })),
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error logging question flow:", error);

    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
