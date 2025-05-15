import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function LeadHistory({ leadId }: { leadId: string }) {
  // 1️⃣ fetch only plain columns – no embedded user table
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["lead-history", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("lead_change_logs")
        .select("*")
        .eq("lead_id", leadId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  /* ─── UI states ─────────────────────────────────────────── */
  if (isLoading) return <p>Loading history…</p>;
  if (error)      return <p>Error loading history.</p>;
  if (!data.length) return <p>No changes recorded yet.</p>;

  /* ─── normal render ─────────────────────────────────────── */
  return (
    <ScrollArea className="h-[400px] space-y-4 pr-2">
      {data.map((log) => (
        <div key={log.id} className="border rounded p-3 text-sm">
          <div className="font-medium mb-1">
            {log.operation} •{" "}
            {new Date(log.changed_at).toLocaleString()} •{" "}
            {log.user_id?.slice(0, 8) ?? "unknown user"}
          </div>

          {log.operation === "UPDATE" && (
            <>
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">
                  Old values
                </summary>
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(log.old_data, null, 2)}
                </pre>
              </details>

              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground">
                  New values
                </summary>
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(log.new_data, null, 2)}
                </pre>
              </details>
            </>
          )}

          {log.operation === "DELETE" && (
            <details>
              <summary className="cursor-pointer text-muted-foreground">
                Deleted record
              </summary>
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(log.old_data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      ))}
    </ScrollArea>
  );
}
