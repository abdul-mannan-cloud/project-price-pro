import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Phone, MessageSquare, Download, FileSpreadsheet, Edit2 } from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
}

export const LeadDetailsDialog = ({ lead, onClose, open }: LeadDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState(lead?.estimate_data);

  const handleSaveEstimate = async () => {
    if (!lead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ estimate_data: editedEstimate })
        .eq('id', lead.id);

      if (error) throw error;

      toast({
        title: "Estimate updated",
        description: "The estimate has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!lead) return null;

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    toast({
      title: "Coming soon",
      description: "PDF export functionality will be available soon.",
    });
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    toast({
      title: "Coming soon",
      description: "CSV export functionality will be available soon.",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-screen p-0 m-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-start max-w-6xl mx-auto">
              <div>
                <h2 className="text-2xl font-bold mb-2">{lead.project_title}</h2>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <p>Status: <Badge variant="outline">{lead.status}</Badge></p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {lead.created_at ? 
                    new Date(lead.created_at).toLocaleDateString() : 
                    "N/A"
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Customer Information */}
              <div className="grid md:grid-cols-2 gap-6 bg-muted/30 p-6 rounded-lg">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Customer Information</h3>
                  <div className="space-y-2">
                    <p><strong>Name:</strong> {lead.user_name || "Not provided"}</p>
                    <p>
                      <strong>Email:</strong>{" "}
                      {lead.user_email ? (
                        <a href={`mailto:${lead.user_email}`} className="text-primary hover:underline">
                          {lead.user_email}
                        </a>
                      ) : "Not provided"}
                    </p>
                    <p>
                      <strong>Phone:</strong>{" "}
                      {lead.user_phone ? (
                        <a href={`tel:${lead.user_phone}`} className="text-primary hover:underline">
                          {lead.user_phone}
                        </a>
                      ) : "Not provided"}
                    </p>
                    <p><strong>Address:</strong> {lead.project_address || "Not provided"}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Project Details</h3>
                  <p>{lead.project_description || "No description provided"}</p>
                </div>
              </div>

              {/* Questions & Answers */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Questions & Answers</h3>
                <div className="space-y-4">
                  {lead.answers && 'answers' in lead.answers && 
                    Object.entries(lead.answers.answers || {}).map(([category, answers]: [string, any]) => (
                      <div key={category} className="bg-muted/30 p-6 rounded-lg">
                        <h4 className="font-medium mb-4">{category}</h4>
                        <div className="space-y-4">
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

              {/* Estimate */}
              {lead.estimate_data && lead.estimate_data.groups && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Generated Estimate</h3>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(!isEditing)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      {isEditing ? "Cancel Editing" : "Edit Estimate"}
                    </Button>
                  </div>
                  <EstimateDisplay 
                    groups={lead.estimate_data.groups}
                    totalCost={lead.estimated_cost || 0}
                    projectSummary={lead.estimate_data.projectSummary}
                    isEditable={isEditing}
                    onEstimateChange={setEditedEstimate}
                  />
                  {isEditing && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={handleSaveEstimate}>Save Changes</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Actions */}
          <div className="border-t bg-background p-4 sticky bottom-0">
            <div className="max-w-6xl mx-auto flex justify-between items-center">
              <div className="flex gap-2">
                {lead.user_phone && (
                  <>
                    <Button variant="outline" className="gap-2">
                      <Phone className="h-4 w-4" />
                      Call
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Text
                    </Button>
                  </>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};