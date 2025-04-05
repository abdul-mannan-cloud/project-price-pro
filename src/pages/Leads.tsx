
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings }
  ];

  // Check authentication status and get contractor ID
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          toast({
            title: "Authentication required",
            description: "Please log in to view leads.",
            variant: "destructive"
          });
        } else {
          const contractor = await supabase
            .from("contractors")
            .select("id")
            .eq("user_id", user.id)
            .single();
          setContractorId(contractor.data.id);
          console.log('Set contractor ID:', user.id);
        }
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", contractorId],
    queryFn: async () => {
      if (!contractorId) throw new Error("No contractor ID available");

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("contractor_id", contractorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(lead => ({
        ...lead,
        answers: lead.answers as { answers: Record<string, any> },
        estimate_data: lead.estimate_data as EstimateData
      })) as Lead[];
    },
    enabled: !!contractorId,
  });

  const deleteLead = useMutation({
    mutationFn: async (leadIds: string[]) => {
      if (!contractorId) throw new Error("No contractor ID available");

      const { error } = await supabase
        .from("leads")
        .delete()
        .in("id", leadIds)
        .eq("contractor_id", contractorId); // Add contractor_id check for security

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", contractorId] });
      toast({
        title: "Leads deleted",
        description: "The selected leads have been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete leads. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateLead = useMutation({
    mutationFn: async (lead: Lead) => {
      if (!contractorId) throw new Error("No contractor ID available");

      const { error } = await supabase
        .from("leads")
        .update(lead)
        .eq("id", lead.id)
        .eq("contractor_id", contractorId); // Add contractor_id check for security

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", contractorId] });
      toast({
        title: "Lead updated",
        description: "The lead has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: "Failed to update lead. Please try again.",
        variant: "destructive",
      });
    },
  })

  const handleLeadClick = async (lead: Lead) => {
    if (!contractorId) {
      toast({
        title: "Error",
        description: "Contractor ID not available. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Ensure the lead has a contractor_id
    if (!lead.contractor_id) {
      const { error: updateError } = await supabase
        .from("leads")
        .update({ contractor_id: contractorId })
        .eq("id", lead.id);

      if (updateError) {
        console.error('Error updating lead with contractor_id:', updateError);
      }
    }

    setSelectedLead(lead);
  };

  const handleExport = (filteredLeads: Lead[]) => {
    // TODO: Implement export functionality
    toast({
      title: "Export",
      description: "Export functionality will be implemented soon.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* <div className="text-lg">Loading...</div> */}
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-6">Leads</h1>
        
        <LeadsTable
          leads={leads}
          updateLead={(lead)=> updateLead.mutate(lead)}
          onLeadClick={handleLeadClick}
          onDeleteLeads={(leadIds) => deleteLead.mutate(leadIds)}
          onExport={handleExport}
        />
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
