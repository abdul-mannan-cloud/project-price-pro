import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Phone, MessageSquare, Mail, X, Edit, Link, Plus, Trash2 } from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { LeadViewToggle } from "./LeadViewToggle";
import { LeadQuestionsView } from "./LeadQuestionsView";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { LeadEditDialog } from "./LeadEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

import {
  AlertDialog as EmailAlertDialog,
  AlertDialogContent as EmailAlertDialogContent,
  AlertDialogHeader as EmailAlertDialogHeader,
  AlertDialogTitle as EmailAlertDialogTitle,
  AlertDialogDescription as EmailAlertDialogDescription,
  AlertDialogFooter as EmailAlertDialogFooter,
  AlertDialogCancel as EmailAlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import Spinner from "../ui/spinner";

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
  urlContractorId?: string | null;
  onLeadUpdated?: () => void;
  onLeadDeleted?: () => void;
}

export const LeadDetailsDialog = ({ 
  lead, 
  onClose, 
  open, 
  urlContractorId,
  onLeadUpdated,
  onLeadDeleted
}: LeadDetailsDialogProps) => {
  const [view, setView] = useState<"estimate" | "questions">("estimate");
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState(lead?.estimate_data);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get current user data if no URL contractor ID
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('No user found');
      return user;
    },
    enabled: !urlContractorId // Only fetch if no URL contractor ID
  });

  // Determine the actual contractor ID to use
  const effectiveContractorId = urlContractorId || 
    lead?.contractor_id ||
    (currentUser?.id ? currentUser.id : null);

  // Fetch contractor data using the effective ID
  const { data: contractor, isLoading: isLoadingContractor } = useQuery({
    queryKey: ['contractor', effectiveContractorId],
    queryFn: async () => {
      if (!effectiveContractorId) throw new Error('No contractor ID available');

      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', effectiveContractorId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('No contractor found');
      return data;
    },
    enabled: !!effectiveContractorId
  });

  // Fetch lead data when needed (for refreshing)
  const fetchLeadData = async () => {
    if (!lead?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead.id)
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching lead data:", error);
      return null;
    }
  };

  useEffect(() => {
    if (lead?.user_email) {
      setEmailRecipient(lead.user_email);
    }
  }, [lead?.user_email]);

  useEffect(() => {
    setEditedEstimate(lead?.estimate_data);
  }, [lead?.estimate_data]);

  const handleSaveEstimate = async () => {
    if (!lead || !effectiveContractorId) {
      toast({
        title: "Error",
        description: "Unable to save estimate. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      console.log('Updating estimate with contractorId:', effectiveContractorId);

      // First update the estimate data
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          estimate_data: editedEstimate,
          estimated_cost: editedEstimate?.totalCost || 0
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      // Then generate a new estimate
      const { error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: lead.id,
          contractorId: effectiveContractorId,
          answers: lead.answers,
          category: lead.category,
          projectDescription: lead.project_description,
          imageUrl: lead.image_url || undefined,
          projectImages: lead.project_images || []
        }
      });

      if (estimateError) throw estimateError;

      // Invalidate the query to force a refresh
      queryClient.invalidateQueries(['lead', lead.id]);

      toast({
        title: "Success",
        description: "The estimate has been successfully updated.",
      });
      setIsEditing(false);
      
      // Notify parent if callback is provided
      if (onLeadUpdated) {
        onLeadUpdated();
      }
    } catch (error) {
      console.error('Error updating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to update estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient || !effectiveContractorId) {
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
          customerEmail: emailRecipient,
          estimateData: lead?.estimate_data,
          estimateUrl,
          contractorId: effectiveContractorId,
          businessName: contractor?.business_name,
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

  const handleAddLineItem = () => {
    if (!lead?.id) {
      toast({
        title: "Error",
        description: "Cannot add line item without lead ID",
        variant: "destructive",
      });
      return;
    }
    
    console.log("Navigating to add line item page with leadId:", lead.id);
    
    // Save required information for passing to the add-line page
    const leadIdToUse = lead.id;
    const estimateData = lead.estimate_data;
    const currentContractorId = lead.contractor_id || effectiveContractorId;
    
    // Store lead data in session storage before navigation
    try {
      console.log("Storing lead data in session storage:", {
        leadId: leadIdToUse,
        estimateData,
        contractorId: currentContractorId
      });
      
      sessionStorage.setItem('pendingAddLine', JSON.stringify({
        leadId: leadIdToUse,
        estimateData,
        contractorId: currentContractorId
      }));
    } catch (e) {
      console.error("Failed to store lead data in session storage:", e);
    }
    
    // Close the dialog before navigation
    onClose();
    
    // Use a longer timeout to ensure dialog is fully closed
    setTimeout(() => {
      try {
        // Add contractor ID as query parameter if available
        const queryParams = currentContractorId ? `?cid=${currentContractorId}` : '';
        const url = `/add-line/${leadIdToUse}${queryParams}`;
        
        console.log(`Attempting to navigate to: ${url}`);
        navigate(url);
      } catch (error) {
        console.error("Navigation error:", error);
        
        // Try alternative navigation paths if the first one fails
        try {
          console.log(`Attempting alternative path: /leads/${leadIdToUse}/add-line`);
          navigate(`/leads/${leadIdToUse}/add-line`);
        } catch (error2) {
          console.error("Second navigation attempt failed:", error2);
          
          try {
            console.log(`Attempting third path: /dashboard/add-line/${leadIdToUse}`);
            navigate(`/dashboard/add-line/${leadIdToUse}`);
          } catch (error3) {
            console.error("All navigation attempts failed:", error3);
            
            toast({
              title: "Navigation Error",
              description: "Could not navigate to add line item page. Please try again.",
              variant: "destructive",
            });
          }
        }
      }
    }, 500); // Increased delay for more reliable navigation
  };

  // Handle edit lead button click
  const handleEditClick = () => {
    setShowEditDialog(true);
  };

  // Handle lead edit completion
  const handleLeadEdited = () => {
    // Close the edit dialog
    setShowEditDialog(false);
    
    // Refresh the lead data
    queryClient.invalidateQueries(['lead', lead?.id]);
    
    // Notify parent if callback is provided
    if (onLeadUpdated) {
      onLeadUpdated();
    }
  };

  // Handle delete lead button click
  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  // Handle lead deletion
  const handleLeadDelete = async () => {
    if (!lead?.id) return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      
      // Close dialogs
      setShowDeleteDialog(false);
      onClose();
      
      // Invalidate queries
      queryClient.invalidateQueries(['leads']);
      
      // Notify parent if callback is provided
      if (onLeadDeleted) {
        onLeadDeleted();
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
      
      toast({
        title: "Error",
        description: "Failed to delete lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const renderActionButtons = () => {
    if (isEditing) {
      return (
        <Button 
          onClick={handleSaveEstimate} 
          disabled={isSaving || (!effectiveContractorId || (isLoadingUser && !urlContractorId))}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      );
    }

    const isLoading = !urlContractorId && isLoadingUser;
    const disabled = isLoading || !effectiveContractorId;

    if (isMobile) {
      return (
        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(true)} 
            className="w-full gap-2"
            disabled={disabled}
          >
            <Edit className="h-4 w-4" />
            Edit Estimate
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowEmailDialog(true)} 
            className="w-full gap-2"
            disabled={disabled}
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            onClick={handleAddLineItem}
            className="w-full gap-2"
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            Add Line
          </Button>
          
          {/* Edit and Delete buttons */}
          <Button
            variant="outline"
            onClick={handleEditClick}
            className="w-full gap-2 col-span-2"
            disabled={disabled}
          >
            <Edit className="h-4 w-4" />
            Edit Lead Details
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
            className="w-full gap-2"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col space-y-4 w-full">
        <div className="grid grid-cols-3 gap-4">
          <Button 
            variant="default" 
            onClick={() => setIsEditing(true)} 
            className="w-full gap-2"
            disabled={disabled}
          >
            <Edit className="h-4 w-4" />
            Edit Estimate
          </Button>
          <Button 
            variant="default" 
            onClick={() => setShowEmailDialog(true)} 
            className="w-full gap-2"
            disabled={disabled}
          >
            <Mail className="h-4 w-4" />
            Email Estimate
          </Button>
          <Button
            variant="default"
            onClick={handleAddLineItem}
            className="w-full gap-2"
            disabled={disabled}
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={handleEditClick}
            className="w-full gap-2"
            disabled={disabled}
          >
            <Edit className="h-4 w-4" />
            Edit Lead Details
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteClick}
            className="w-full gap-2"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
            Delete Lead
          </Button>
        </div>
      </div>
    );
  };

  if ((isLoadingUser && !urlContractorId) || isLoadingContractor) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-full h-[100vh] p-0 m-0">
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-full h-[100vh] p-0 m-0">
          <div className="flex flex-col h-full relative overflow-y-scroll pb-20">
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
                        totalCost={lead?.estimate_data?.totalCost || 0}
                        projectSummary={lead?.project_description}
                        isEditable={isEditing}
                        onEstimateChange={setEditedEstimate}
                        contractor={contractor}
                        contractorParam={contractor?.id}
                        leadId={lead?.id}
                      />
                    </div>
                    {!isEditing && (
                      <div className="mt-6 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={handleAddLineItem}
                          className="px-6 py-2 flex items-center gap-2"
                          disabled={!effectiveContractorId}
                        >
                          <Plus className="h-4 w-4" />
                          Add Line Item
                        </Button>
                      </div>
                    )}
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

      {/* Email Dialog */}
      <EmailAlertDialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <EmailAlertDialogContent>
          <EmailAlertDialogHeader>
            <EmailAlertDialogTitle>Send Estimate</EmailAlertDialogTitle>
            <EmailAlertDialogDescription>
              Enter the email address where you'd like to send this estimate.
            </EmailAlertDialogDescription>
          </EmailAlertDialogHeader>
          <div className="py-4">
            <Input
              type="email"
              placeholder="Email address"
              value={emailRecipient}
              onChange={(e) => setEmailRecipient(e.target.value)}
            />
          </div>
          <EmailAlertDialogFooter>
            <EmailAlertDialogCancel>Cancel</EmailAlertDialogCancel>
            <Button 
              onClick={handleSendEmail}
              disabled={isLoadingUser || !effectiveContractorId}
            >
              Send Email
            </Button>
          </EmailAlertDialogFooter>
        </EmailAlertDialogContent>
      </EmailAlertDialog>

      {/* Lead Edit Dialog */}
      {showEditDialog && lead && (
        <LeadEditDialog 
          lead={lead} 
          isOpen={showEditDialog} 
          onClose={() => setShowEditDialog(false)}
          onLeadUpdated={handleLeadEdited}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this lead 
              and all associated estimate data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeadDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};