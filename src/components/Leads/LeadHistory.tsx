// src/components/ui/LeadHistory.tsx
import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

// — new imports for the styled dialog —
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface ChangeRow {
  field: string;
  oldValue?: string;
  newValue?: string;
}

// USD formatter
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// ISO8601 detection
const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?[+-]\d{2}:\d{2}$/;
function formatMaybeTimestamp(val?: string): string | undefined {
  if (!val) return val;
  if (isoTimestampRegex.test(val)) {
    return new Date(val).toLocaleString();
  }
  return val;
}

const describeEstimateDiff = (oldEst: any = {}, newEst: any = {}): ChangeRow[] => {
  const rows: ChangeRow[] = [];
  const oldGroups = oldEst.groups || [];
  const newGroups = newEst.groups || [];

  if (newGroups.length > oldGroups.length) {
    newGroups.slice(oldGroups.length).forEach((g) => {
      rows.push({ field: "Added section" });
      (g.subgroups || []).forEach((sub: any) => {
        (sub.items || []).forEach((item: any) => {
          rows.push({
            field: `Added item in "${sub.name}"`,
            newValue: `${item.title} · Qty: ${item.quantity} · Price: ${currencyFormatter.format(item.unitAmount)}`,
          });
        });
      });
    });
  }
  if (oldGroups.length > newGroups.length) {
    oldGroups.slice(newGroups.length).forEach(() => {
      rows.push({ field: "Removed section" });
    });
  }
  newGroups.forEach((g, gi) => {
    const og = oldGroups[gi];
    if (!og) return;
    (g.subgroups || []).forEach((sub: any) => {
      const osub = (og.subgroups || []).find((os: any) => os.name === sub.name);

      (sub.items || []).forEach((item: any) => {
        const existed = (osub?.items || []).some((oi: any) => oi.title === item.title);
        if (!existed) {
          rows.push({
            field: `Added item in "${sub.name}"`,
            newValue: `${item.title} · Qty: ${item.quantity} · Price: ${currencyFormatter.format(item.unitAmount)}`,
          });
        }
      });

      (osub?.items || []).forEach((item: any) => {
        const stillHere = (sub.items || []).some((ni: any) => ni.title === item.title);
        if (!stillHere) {
          rows.push({
            field: `Removed item from "${sub.name}"`,
            oldValue: item.title,
          });
        }
      });
    });
  });

  return rows;
};

const getChangeRows = (oldData: any = {}, newData: any = {}): ChangeRow[] => {
  const rows: ChangeRow[] = [];
  const oldEst = oldData.estimate_data || {};
  const newEst = newData.estimate_data || {};

  rows.push(...describeEstimateDiff(oldEst, newEst));

  if (oldEst.totalCost != null && newEst.totalCost != null && oldEst.totalCost !== newEst.totalCost) {
    // Subtotal
    rows.push({
      field: "Subtotal",
      oldValue: currencyFormatter.format(oldEst.totalCost),
      newValue: currencyFormatter.format(newEst.totalCost),
    });
    // Tax
    const oldTax = oldEst.totalCost * 0.085;
    const newTax = newEst.totalCost * 0.085;
    rows.push({
      field: "Tax (8.5%)",
      oldValue: currencyFormatter.format(oldTax),
      newValue: currencyFormatter.format(newTax),
    });
    // Total
    rows.push({
      field: "Total Estimate",
      oldValue: currencyFormatter.format(oldEst.totalCost + oldTax),
      newValue: currencyFormatter.format(newEst.totalCost + newTax),
    });
  }

  Object.keys({ ...oldData, ...newData }).forEach((key) => {
    if (["estimate_data", "estimated_cost"].includes(key)) return;
    const oVal = oldData[key], nVal = newData[key];
    if (JSON.stringify(oVal) !== JSON.stringify(nVal)) {
      let oldValue = typeof oVal === "string" ? oVal : JSON.stringify(oVal);
      let newValue = typeof nVal === "string" ? nVal : JSON.stringify(nVal);
      oldValue = formatMaybeTimestamp(oldValue);
      newValue = formatMaybeTimestamp(newValue);
      rows.push({ field: key, oldValue, newValue });
    }
  });

  return rows;
};

export default function LeadHistory({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const [pendingRevert, setPendingRevert] = useState<any>(null);

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["lead-history", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_change_logs")
        .select("*")
        .eq("lead_id", leadId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Actually perform the revert
  const performRevert = async (log: any) => {
    const snap =
      log.operation === "UPDATE" ? log.old_data :
      log.operation === "INSERT" ? log.new_data :
      null;
    if (!snap) {
      toast({ title: "Cannot revert", variant: "destructive" });
    } else {
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
      } else {
        qc.invalidateQueries(["lead", leadId]);
        qc.invalidateQueries(["lead-history", leadId]);
        toast({ title: "Reverted" });
      }
    }
    setPendingRevert(null);
  };

  if (isLoading) return <p>Loading history…</p>;
  if (error) return <p>Error loading history.</p>;
  if (!data.length) return <p>No changes recorded yet.</p>;

  return (
    <>
      <ScrollArea className="h-full space-y-4 pr-2">
        {data.map((log) => {
          const rows = log.operation === "UPDATE"
            ? getChangeRows(log.old_data, log.new_data)
            : [];

          return (
            <div key={log.id} className="bg-white shadow rounded-lg p-4">
              <div className="flex justify-between items-center text-gray-700 font-medium mb-2">
                <span>
                  {log.operation} • {new Date(log.changed_at).toLocaleString()}
                </span>
                <span className="text-sm text-gray-500">
                  {log.user_id?.slice(0, 8) ?? "unknown user"}
                </span>
              </div>

              {log.operation === "UPDATE" && (
                <details className="border-t pt-2">
                  <summary className="flex justify-between items-center cursor-pointer text-black hover:text-blue-500">
                    <span>Show Changes</span>
                    <ChevronDown className="w-5 h-5 transition-transform duration-200 data-[state=open]:rotate-180" />
                  </summary>

                  {/* Section notes */}
                  <div className="mt-2 space-y-1">
                    {rows
                      .filter(r => ["Added section","Removed section"].includes(r.field))
                      .map((r,i) => (
                        <div key={i} className="italic text-gray-600 px-2">
                          {r.field}
                        </div>
                      ))}
                  </div>

                  {/* Detail table */}
                  {rows.some(r => !["Added section","Removed section"].includes(r.field)) && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-max w-full divide-y divide-gray-200 text-sm whitespace-nowrap">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase">
                              Field / Info
                            </th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase">
                              Old Value
                            </th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600 uppercase">
                              New Value
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {rows
                            .filter(r => !["Added section","Removed section"].includes(r.field))
                            .map((r, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-2">{r.field}</td>
                                <td className="px-4 py-2 text-gray-700">{r.oldValue}</td>
                                <td className="px-4 py-2 text-gray-700">{r.newValue}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </details>
              )}

              {log.operation === "DELETE" && (
                <details className="border-t pt-2">
                  <summary className="cursor-pointer text-red-600">Show Deleted Data</summary>
                  <pre className="mt-2 bg-gray-50 p-2 rounded text-xs overflow-auto">
                    {JSON.stringify(log.old_data, null, 2)}
                  </pre>
                </details>
              )}

              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => setPendingRevert(log)}>
                  Revert to this version
                </Button>
              </div>
            </div>
          );
        })}
      </ScrollArea>

      {/* Responsive — styled confirmation dialog */}
      <AlertDialog open={!!pendingRevert} onOpenChange={() => setPendingRevert(null)}>
        <AlertDialogContent className="w-[90vw] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to this version?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to roll back to the snapshot taken at{" "}
              {pendingRevert && new Date(pendingRevert.changed_at).toLocaleString()}?
              Your current data will be replaced with the old data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => performRevert(pendingRevert!)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}