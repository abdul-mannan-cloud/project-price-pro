
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Phone, MessageSquare, Download, FileSpreadsheet, Mail, X, Edit, Link } from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { LeadViewToggle } from "./LeadViewToggle";
import { LeadQuestionsView } from "./LeadQuestionsView";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
}

export const LeadDetailsDialog = ({ lead, onClose, open }: LeadDetailsDialogProps) => {
  const [view, setView] = useState<"estimate" | "questions">("estimate");
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState(lead?.estimate_data);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const isMobile = useIsMobile();

  // Get contractor ID from current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  // Fetch contractor data
  const { data: contractor } = useQuery({
    queryKey: ['contractor', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return null;
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentUser?.id
  });

  useEffect(() => {
    if (lead?.user_email) {
      setEmailRecipient(lead.user_email);
    }
  }, [lead?.user_email]);

  const handleSaveEstimate = async () => {
    if (!lead || !currentUser?.id) return;

    try {
      const { error } = await supabase
        .from('leads')
        .update({ estimate_data: editedEstimate })
        .eq('id', lead.id);

      if (error) throw error;

      // Generate a new estimate
      const { error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: lead.id,
          contractorId: currentUser.id // Explicitly pass contractor ID
        }
      });

      if (estimateError) throw estimateError;

      toast({
        title: "Estimate updated",
        description: "The estimate has been successfully updated.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to update estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient || !currentUser?.id) {
      toast({
        title: "Error",
        description: "Please provide an email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const estimateUrl = `${window.location.origin}/e/${lead?.id}`;
      const response = await supabase.functions.invoke('send-estimate-email', {
        body: {
          name: lead?.user_name,
          email: emailRecipient,
          estimateData: lead?.estimate_data,
          estimateUrl,
          contractorId: currentUser.id // Explicitly pass contractor ID
        },
      });

      if (response.error) throw response.error;

      toast({
        title: "Email sent",
        description: "The estimate has been sent successfully.",
      });
      setShowEmailDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    const estimateUrl = `${window.location.origin}/e/${lead?.id}`;
    navigator.clipboard.writeText(estimateUrl).then(() => {
      toast({
        title: "Link copied",
        description: "The estimate link has been copied to your clipboard.",
      });
    });
  };

  const renderActionButtons = () => {
    if (isEditing) {
      return <Button onClick={handleSaveEstimate}>Save Changes</Button>;
    }

    if (isMobile) {
      return (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)} className="w-full gap-2">
            <Edit className="h-4 w-4" />
            Edit Estimate
          </Button>
          <Button variant="outline" onClick={() => setShowEmailDialog(true)} className="w-full gap-2">
            <Mail className="h-4 w-4" />
            Email Estimate
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full grid grid-cols-2 gap-4">
        <Button variant="default" onClick={() => setIsEditing(true)} className="w-full gap-2">
          <Edit className="h-4 w-4" />
          Edit Estimate
        </Button>
        <Button variant="default" onClick={() => setShowEmailDialog(true)} className="w-full gap-2">
          <Mail className="h-4 w-4" />
          Email Estimate
        </Button>
      </div>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-full h-[100vh] p-0 m-0">
          <div className="flex flex-col h-full relative">
            {isMobile ? (
              <div className="sticky top-0 z-50 bg-white border-b">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
                <div className="h-14" />
              </div>
            ) : (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-50"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}

            <div className="border-b bg-background sticky top-0 z-40">
              <div className="max-w-6xl mx-auto w-[95%]">
                <LeadViewToggle view={view} onViewChange={setView} />
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0' : 'p-6'}`}>
              <div className="max-w-6xl mx-auto pt-6">
                {view === "estimate" && (
                  <>
                    {renderActionButtons()}
                    <div className="mt-4">
                      <EstimateDisplay 
                        groups={lead?.estimate_data?.groups || []}
                        totalCost={lead?.estimated_cost || 0}
                        projectSummary={lead?.project_description}
                        isEditable={isEditing}
                        onEstimateChange={setEditedEstimate}
                        contractor={contractor}
                      />
                    </div>
                  </>
                )}
                {view === "questions" && (
                  <LeadQuestionsView lead={lead} />
                )}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
              <div className="container max-w-6xl mx-auto flex justify-between gap-4">
                <Button variant="outline" className="w-full gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button variant="outline" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Text
                </Button>
                <Button variant="outline" className="w-full gap-2" onClick={handleCopyLink}>
                  <Link className="h-4 w-4" />
                  Copy Link
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Estimate</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the email address where you'd like to send this estimate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="email"
              placeholder="Email address"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleSendEmail}>Send Email</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
