import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

export default function LeadHistory({ leadId }: { leadId: string }) {
  const qc = useQueryClient();

  // Fetch lead change logs
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

  /* Helper: revert to this snapshot */
  const revertTo = async (log: any) => {
    if (!confirm("Revert lead to this version?")) return;

    // Pick the snapshot to restore
    const snap =
      log.operation === "UPDATE"
        ? log.old_data
        : log.operation === "INSERT"
        ? log.new_data
        : null;

    if (!snap) {
      toast({ title: "Cannot revert this entry", variant: "destructive" });
      return;
    }

    // Strip immutable columns
    const patch = { ...snap };
    delete patch.id;
    delete patch.created_at;
    delete patch.updated_at;

    const { error: revertError } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", leadId);

    if (revertError) {
      toast({ title: "Revert failed", description: revertError.message, variant: "destructive" });
      return;
    }

    // Refresh lead + history caches
    qc.invalidateQueries(["lead", leadId]);
    qc.invalidateQueries(["lead-history", leadId]);

    toast({ title: "Lead reverted" });
  };

  if (isLoading) return <p>Loading history…</p>;
  if (error) return <p>Error loading history.</p>;
  if (!data.length) return <p>No changes recorded yet.</p>;

  return (
    <ScrollArea className="h-[400px] space-y-4 pr-2">
      {data.map((log) => (
        <div key={log.id} className="border rounded p-3 text-sm">
          <div className="font-medium mb-1">
            {log.operation} • {new Date(log.changed_at).toLocaleString()} • {log.user_id?.slice(0, 8) ?? "unknown user"}
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

          {/* ▶ Revert button */}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={() => revertTo(log)}>
              Revert to this version
            </Button>
          </div>
        </div>
      ))}
    </ScrollArea>
  );
}
