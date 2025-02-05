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

const Leads = () => {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings }
  ];

  // Check authentication status
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
        }
      } catch (error) {
        console.error("Auth error:", error);
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map(lead => ({
        ...lead,
        answers: lead.answers as { answers: Record<string, any> },
        estimate_data: lead.estimate_data as EstimateData
      })) as Lead[];
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (leadIds: string[]) => {
      const { error } = await supabase
        .from("leads")
        .delete()
        .in("id", leadIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: "Leads deleted",
        description: "The selected leads have been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete leads. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = (filteredLeads: Lead[]) => {
    // TODO: Implement export functionality
    toast({
      title: "Export",
      description: "Export functionality will be implemented soon.",
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-6">Leads</h1>
        
        <LeadsTable
          leads={leads}
          onLeadClick={setSelectedLead}
          onDeleteLeads={(leadIds) => deleteLead.mutate(leadIds)}
          onExport={handleExport}
        />
      </div>

      <LeadDetailsDialog
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        open={!!selectedLead}
      />
    </div>
  );
};

export default Leads;
