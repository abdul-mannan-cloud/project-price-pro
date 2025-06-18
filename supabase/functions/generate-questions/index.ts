import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDescription } = await req.json();
    console.log("Processing request with description:", projectDescription);

    const llamaApiKey = Deno.env.get("LLAMA_API_KEY");
    if (!llamaApiKey) {
      throw new Error("Missing LLAMA_API_KEY");
    }

    // Generate questions using Llama API
    const analysisResponse = await fetch(
      "https://api.llama-api.com/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${llamaApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a construction project analyzer. Generate questions to understand project requirements.",
            },
            {
              role: "user",
              content: `Generate questions for this project: ${projectDescription}`,
            },
          ],
          temperature: 0.2,
        }),
      },
    );

    if (!analysisResponse.ok) {
      throw new Error("Failed to generate questions");
    }

    const analysisData = await analysisResponse.json();

    // Format questions to match our Question interface
    const questions = analysisData.choices[0].message.content
      .split("\n")
      .filter((q: string) => q.trim())
      .map((q: string, index: number) => ({
        id: `q-${index}`,
        question: q,
        options: [
          { id: `opt-${index}-1`, label: "Yes" },
          { id: `opt-${index}-2`, label: "No" },
        ],
        multi_choice: false,
        is_branching: false,
      }));

    return new Response(
      JSON.stringify({
        questions,
        totalStages: questions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in generate-questions function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
