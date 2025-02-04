import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { LeadsTable } from "@/components/Leads/LeadsTable";
import { LayoutDashboard, Users, Settings } from "lucide-react";

const Leads = () => {
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const queryClient = useQueryClient();

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings }
  ];

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
      return data || [];
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

  const handleExport = (filteredLeads: any[]) => {
    const csvContent = [
      ["Project Title", "Address", "Customer", "Email", "Phone", "Estimated Cost", "Status", "Created"],
      ...filteredLeads.map(lead => [
        lead.project_title,
        lead.project_address,
        lead.user_name,
        lead.user_email,
        lead.user_phone,
        lead.estimated_cost,
        lead.status,
        new Date(lead.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `leads-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
          {selectedLead && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedLead.project_title}</h2>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <p>Status: <Badge variant="outline">{selectedLead.status}</Badge></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {selectedLead.created_at ? 
                      new Date(selectedLead.created_at).toLocaleDateString() : 
                      "N/A"
                    }
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customer Information</h3>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {selectedLead.user_name || "Not provided"}</p>
                    <p>
                      <strong>Email:</strong>{" "}
                      {selectedLead.user_email ? (
                        <a 
                          href={`mailto:${selectedLead.user_email}`}
                          className="text-primary hover:underline"
                        >
                          {selectedLead.user_email}
                        </a>
                      ) : "Not provided"}
                    </p>
                    <p>
                      <strong>Phone:</strong>{" "}
                      {selectedLead.user_phone ? (
                        <a 
                          href={`tel:${selectedLead.user_phone}`}
                          className="text-primary hover:underline"
                        >
                          {selectedLead.user_phone}
                        </a>
                      ) : "Not provided"}
                    </p>
                    <p><strong>Address:</strong> {selectedLead.project_address || "Not provided"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Project Details</h3>
                  <p>{selectedLead.project_description || "No description provided"}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Questions & Answers</h3>
                <div className="space-y-4">
                  {Object.entries(selectedLead.answers?.answers || {}).map(([category, answers]: [string, any]) => (
                    <div key={category} className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">{category}</h4>
                      <div className="space-y-2">
                        {Object.values(answers || {}).map((qa: any, index: number) => {
                          const selectedOptions = (qa.options || [])
                            .filter((opt: any) => (qa.answers || []).includes(opt.value))
                            .map((opt: any) => opt.label)
                            .join(", ");

                          return (
                            <div key={index} className="grid grid-cols-2 gap-4">
                              <p className="text-sm font-medium">{qa.question}</p>
                              <p className="text-sm">{selectedOptions}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedLead.estimate_data && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Generated Estimate</h3>
                  <EstimateDisplay 
                    groups={selectedLead.estimate_data.groups || []}
                    totalCost={selectedLead.estimated_cost || 0}
                    projectSummary={selectedLead.estimate_data.projectSummary}
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Leads;