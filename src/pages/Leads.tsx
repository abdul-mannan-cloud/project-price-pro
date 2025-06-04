/* --------------------------------------------------------------------------
   src/pages/Leads.tsx   – drop-in replacement
   ────────────────────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { toast } from "@/hooks/use-toast";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { LeadDetailsDialog } from "@/components/Leads/LeadDetailsDialog";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Lead, EstimateData } from "@/components/Leads/LeadsTable";
import Spinner from "@/components/ui/spinner";

const Leads = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [contractorId, setContractorId] = useState<string | null>(null);

  /* ── top nav items ──────────────────────────────────────────────── */
  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings },
  ];

  /* ── auth & contractorId ────────────────────────────────────────── */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/login");
          toast({
            title: "Authentication required",
            description: "Please log in to view leads.",
            variant: "destructive",
          });
          return;
        }

        const { data, error } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (error || !data) throw error || new Error("No contractor");

        setContractorId(data.id);
      } catch (err) {
        console.error("Auth error:", err);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  /* ── leads list ─────────────────────────────────────────────────── */
  const {
    data: leads = [],
    isLoading,
  } = useQuery({
    queryKey: ["leads", contractorId],
    enabled: !!contractorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map(
        (lead) =>
          ({
            ...lead,
            answers: lead.answers as { answers: Record<string, any> },
            estimate_data: lead.estimate_data as EstimateData,
          }) as Lead,
      );
    },
  });

  /* ── realtime sync ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!contractorId) return;

    const channel = supabase
      .channel(`leads-${contractorId}`)
      .on(
        "postgres_changes",
        {
          schema: "public",
          table: "leads",
          filter: `contractor_id=eq.${contractorId}`,
        },
        (payload) => {
          queryClient.setQueryData<Lead[]>(
            ["leads", contractorId],
            (old = []) => {
              switch (payload.eventType) {
                case "INSERT":
                  if (old.some((l) => l.id === payload.new.id)) return old;
                  return [payload.new as Lead, ...old];
                case "UPDATE":
                  return old.map((l) =>
                    l.id === payload.new.id ? (payload.new as Lead) : l,
                  );
                case "DELETE":
                  return old.filter((l) => l.id !== payload.old.id);
                default:
                  return old;
              }
            },
          );
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [contractorId, queryClient]);

  /* ── mutations ──────────────────────────────────────────────────── */
  const deleteLead = useMutation({
    mutationFn: async (ids: string[]) => {
      await supabase
        .from("leads")
        .delete()
        .in("id", ids)
        .eq("contractor_id", contractorId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", contractorId] });
      toast({
        title: "Leads deleted",
        description: "The selected leads have been deleted successfully.",
      });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to delete leads. Please try again.",
        variant: "destructive",
      }),
  });

  const updateLead = useMutation({
    mutationFn: async (lead: Lead) => {
      await supabase
        .from("leads")
        .update(lead)
        .eq("id", lead.id)
        .eq("contractor_id", contractorId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", contractorId] });
      toast({
        title: "Lead updated",
        description: "The lead has been updated successfully.",
      });
    },
    onError: () =>
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      }),
  });

  /* ── helpers ───────────────────────────────────────────────────── */
  const waitingForData = !contractorId || isLoading;

  const handleLeadClick = async (lead: Lead) => {
    if (!lead.contractor_id && contractorId) {
      await supabase
        .from("leads")
        .update({ contractor_id: contractorId })
        .eq("id", lead.id);
    }
    setSelectedLead(lead);
  };

  const handleExport = () =>
    toast({
      title: "Export",
      description: "Export functionality will be implemented soon.",
    });

  /* ── UI ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />

      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-6">Leads</h1>

        {waitingForData ? (
          <div className="h-[60vh] flex items-center justify-center">
            <Spinner />
          </div>
        ) : leads.length ? (
          <LeadsTable
            leads={leads}
            updateLead={(lead) => updateLead.mutate(lead)}
            onLeadClick={handleLeadClick}
            onDeleteLeads={(ids) => deleteLead.mutate(ids)}
            onExport={handleExport}
          />
        ) : (
          <div className="h-[60vh] flex items-center justify-center">
            <p className="text-primary text-xl font-semibold">
              There are no leads yet!
            </p>
          </div>
        )}
      </div>

      <LeadDetailsDialog
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        open={!!selectedLead}
        urlContractorId={contractorId}
      />
    </div>
  );
};

export default Leads;
