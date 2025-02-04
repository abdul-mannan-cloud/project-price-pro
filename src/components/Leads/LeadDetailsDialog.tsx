import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Phone, MessageSquare, Download, FileSpreadsheet, Mail, X, Edit, MoreVertical } from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { LeadViewToggle } from "./LeadViewToggle";
import { LeadQuestionsView } from "./LeadQuestionsView";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
}

export const LeadDetailsDialog = ({ lead, onClose, open }: LeadDetailsDialogProps) => {
  const [view, setView] = useState<"estimate" | "questions">("estimate");
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState(lead?.estimate_data);
  const isMobile = useIsMobile();

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

  const renderActionButtons = () => {
    if (isEditing) {
      return <Button onClick={handleSaveEstimate}>Save Changes</Button>;
    }

    if (isMobile) {
      return (
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSendEmail} className="gap-2">
            <Mail className="h-4 w-4" />
            Email Estimate
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Estimate
              </DropdownMenuItem>
              {lead.user_phone && (
                <>
                  <DropdownMenuItem>
                    <Phone className="h-4 w-4 mr-2" />
                    Call
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Text
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <>
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
          {view === "estimate" && (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Estimate
              </Button>
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
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-full h-[100vh] p-0 m-0">
        <div className="flex flex-col h-full relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>

          <div className="border-b bg-background sticky top-0 z-40">
            <div className="max-w-6xl mx-auto w-[95%]">
              <LeadViewToggle view={view} onViewChange={setView} />
            </div>
          </div>

          <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0' : 'p-6'}`}>
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

          <div className="border-t bg-background py-4 w-full">
            <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};