import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Get all tasks needing embeddings
    const { data: tasks } = await supabase
      .from("units")
      .select("id, task_name, description")
      .is("embedding", null);

    console.log("embedding  tasks test", tasks.length);

    if (!tasks?.length) {
      return new Response(
        JSON.stringify({ message: "No tasks need embeddings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Process in batches of 20 to avoid rate limits
    const BATCH_SIZE = 20;
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const batch = tasks.slice(i, i + BATCH_SIZE);
      await processBatch(batch, supabase);
      console.log(
        `Processed batch ${i / BATCH_SIZE + 1}/${Math.ceil(tasks.length / BATCH_SIZE)}`,
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: tasks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function processBatch(batch: any[], supabase: any) {
  const embeddings = await Promise.all(
    batch.map((task) => generateEmbedding(task)),
  );

  console.log("embedding test", embeddings);

  // Use Promise.all to run updates in parallel, but await each response
  const updates = batch.map(async (task, index) => {
    console.log("task test", task);

    const { data, error } = await supabase
      .from("units")
      .update({ embedding: embeddings[index] })
      .eq("id", task.id);

    if (error) {
      console.error(`Update failed for task ID ${task.id}:`, error);
    } else {
      console.log(`Update succeeded for task ID ${task.id}`, data);
    }
  });

  await Promise.all(updates);
}

async function generateEmbedding(task: any): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: `${task.task_name}: ${task.description}`,
      model: "text-embedding-3-small",
    }),
  });

  const { data } = await response.json();
  return data[0].embedding;
}
