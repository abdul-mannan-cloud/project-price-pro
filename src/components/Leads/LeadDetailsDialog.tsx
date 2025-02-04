import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Phone, MessageSquare, Download, FileSpreadsheet, Mail } from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { LeadViewToggle } from "./LeadViewToggle";
import { LeadQuestionsView } from "./LeadQuestionsView";
import { supabase } from "@/integrations/supabase/client";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
}

export const LeadDetailsDialog = ({ lead, onClose, open }: LeadDetailsDialogProps) => {
  const [view, setView] = useState<"estimate" | "questions">("estimate");
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

  const handleSendEmail = async () => {
    if (!lead?.user_email) {
      toast({
        title: "Error",
        description: "No email address provided for this lead.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/send-estimate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: lead.user_name,
          email: lead.user_email,
          estimateData: lead.estimate_data,
          estimateUrl: window.location.href,
        }),
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast({
        title: "Email sent",
        description: "The estimate has been sent to the customer.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-screen p-0 m-0">
        <div className="flex flex-col h-full">
          {/* Top Toggle Bar */}
          <LeadViewToggle view={view} onViewChange={setView} />

          {/* Content Area - Make it fill available space and scroll */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              {view === "estimate" ? (
                <EstimateDisplay 
                  groups={lead.estimate_data?.groups || []}
                  totalCost={lead.estimated_cost || 0}
                  projectSummary={lead.project_description}
                  isEditable={isEditing}
                  onEstimateChange={setEditedEstimate}
                />
              ) : (
                <LeadQuestionsView lead={lead} />
              )}
            </div>
          </div>

          {/* Bottom Actions - Now properly sticky */}
          <div className="border-t bg-background p-4 w-full">
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
                {view === "estimate" && isEditing ? (
                  <Button onClick={handleSaveEstimate}>Save Changes</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleSendEmail} className="gap-2">
                      <Mail className="h-4 w-4" />
                      Email Estimate
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export PDF
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};