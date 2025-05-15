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

  // Human-readable diff of estimate_data changes
  const describeEstimateDiff = (oldEst: any = {}, newEst: any = {}) => {
    const messages: string[] = [];
    const oldGroups = oldEst.groups || [];
    const newGroups = newEst.groups || [];

    // Section additions/removals
    if (newGroups.length > oldGroups.length) {
      newGroups.slice(oldGroups.length).forEach(g => {
        messages.push(`Added section "${g.name}"`);
      });
    } else if (oldGroups.length > newGroups.length) {
      oldGroups.slice(newGroups.length).forEach(g => {
        messages.push(`Removed section "${g.name}"`);
      });
    }

    // For each matching section, compare subgroups/items
    newGroups.forEach((g, gi) => {
      const og = oldGroups[gi];
      if (!og) return;
      g.subgroups.forEach((sub, si) => {
        const osub = og.subgroups[si];
        if (!osub) {
          messages.push(`Added subgroup "${sub.name}" in section "${g.name}"`);
          return;
        }
        // Detect added items
        const oldTitles = osub.items.map(i => i.title);
        const newTitles = sub.items.map(i => i.title);
        newTitles.forEach(t => {
          if (!oldTitles.includes(t)) messages.push(`Added item "${t}" in "${sub.name}"`);
        });
        oldTitles.forEach(t => {
          if (!newTitles.includes(t)) messages.push(`Removed item "${t}" from "${sub.name}"`);
        });
      });
    });

    return messages;
  };

  // Format changes between old and new data as readable string
  const formatChanges = (oldData: any, newData: any) => {
    // If estimate_data changed, describe high-level changes
    const oldEst = oldData.estimate_data;
    const newEst = newData.estimate_data;
    let msgs: string[] = [];
    if (oldEst || newEst) {
      msgs = describeEstimateDiff(oldEst, newEst);
    }
    // For other top-level fields, fallback to flat diff
    const flatDiffs: string[] = [];
    const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]));
    allKeys.forEach(key => {
      if (key === 'estimate_data') return;
      const o = oldData[key];
      const n = newData[key];
      if (JSON.stringify(o) !== JSON.stringify(n)) {
        flatDiffs.push(`${key}: ${JSON.stringify(o)} → ${JSON.stringify(n)}`);
      }
    });
    if (flatDiffs.length) msgs = msgs.concat(flatDiffs);
    return msgs.length ? msgs.join("\n") : "(no changes)";
  };

  /* Helper: revert to this snapshot */
  const revertTo = async (log: any) => {
    if (!confirm("Revert lead to this version?")) return;

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

    qc.invalidateQueries(["lead", leadId]);
    qc.invalidateQueries(["lead-history", leadId]);

    toast({ title: "Lead reverted" });
  };

  if (isLoading) return <p>Loading history…</p>;
  if (error) return <p>Error loading history.</p>;
  if (!data.length) return <p>No changes recorded yet.</p>;

  return (
    <ScrollArea className="h-[400px] space-y-4 pr-2">
      {data.map(log => (
        <div key={log.id} className="border rounded p-3 text-sm">
          <div className="font-medium mb-1">
            {log.operation} • {new Date(log.changed_at).toLocaleString()} • {log.user_id?.slice(0, 8) ?? "unknown user"}
          </div>

          {log.operation === "UPDATE" && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">Changes</summary>
              <pre className="whitespace-pre-wrap break-words">
                {formatChanges(log.old_data, log.new_data)}
              </pre>
            </details>
          )}

          {log.operation === "DELETE" && (
            <details className="mt-2">
              <summary className="cursor-pointer text-muted-foreground">Deleted record</summary>
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
