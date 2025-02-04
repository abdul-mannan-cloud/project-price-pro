import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Settings, MoreVertical, Phone, Mail, Trash2, ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "in-progress": "bg-blue-100 text-blue-800"
} as const;

type Status = keyof typeof statusColors;

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

  const updateLeadStatus = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string, status: Status }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: "Status updated",
        description: "The lead status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update lead status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", leadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: "Lead deleted",
        description: "The lead has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const handleStatusChange = (leadId: string, newStatus: Status) => {
    updateLeadStatus.mutate({ leadId, status: newStatus });
  };

  const handleDelete = (leadId: string) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      deleteLead.mutate(leadId);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-6">Leads</h1>
        
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Project Title</TableHead>
                <TableHead className="h-9 py-2">Category</TableHead>
                <TableHead className="h-9 py-2">Customer</TableHead>
                <TableHead className="h-9 py-2">Contact</TableHead>
                <TableHead className="h-9 py-2">Estimated Cost</TableHead>
                <TableHead className="h-9 py-2">Status</TableHead>
                <TableHead className="h-9 py-2">Created</TableHead>
                <TableHead className="h-9 py-2 w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow 
                  key={lead.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedLead(lead)}
                >
                  <TableCell className="py-2 font-medium">{lead.project_title}</TableCell>
                  <TableCell className="py-2">{lead.category}</TableCell>
                  <TableCell className="py-2">{lead.user_name || "Anonymous"}</TableCell>
                  <TableCell className="py-2">
                    <div className="flex gap-2">
                      {lead.user_email && (
                        <a 
                          href={`mailto:${lead.user_email}`}
                          className="inline-flex items-center hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          <span className="sr-only">Email</span>
                        </a>
                      )}
                      {lead.user_phone && (
                        <a 
                          href={`tel:${lead.user_phone}`}
                          className="inline-flex items-center hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-4 h-4 mr-1" />
                          <span className="sr-only">Call</span>
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    ${lead.estimated_cost?.toLocaleString() || "0"}
                  </TableCell>
                  <TableCell className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          className={cn(
                            "h-auto py-1 px-2 font-normal",
                            statusColors[lead.status as Status] || statusColors.pending
                          )}
                        >
                          {lead.status || "pending"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {Object.keys(statusColors).map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => handleStatusChange(lead.id, status as Status)}
                          >
                            {status}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="py-2">
                    {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedLead(lead)}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(lead.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Lead
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
          {selectedLead && (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedLead.project_title}</h2>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <p>Category: {selectedLead.category}</p>
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
                  {Object.entries(selectedLead.answers || {}).map(([category, answers]: [string, any]) => (
                    <div key={category} className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">{category}</h4>
                      <div className="space-y-2">
                        {Object.values(answers).map((qa: any, index: number) => (
                          <div key={index} className="grid grid-cols-2 gap-4">
                            <p className="text-sm font-medium">{qa.question}</p>
                            <p className="text-sm">
                              {qa.options
                                .filter((opt: any) => qa.answers.includes(opt.value))
                                .map((opt: any) => opt.label)
                                .join(", ")}
                            </p>
                          </div>
                        ))}
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