import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  X, 
  Edit, 
  Link as LinkIcon, 
  Trash2, 
  MoreHorizontal, 
  Copy,
  LockIcon,
  UnlockIcon
} from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { LeadViewToggle } from "./LeadViewToggle";
import { LeadQuestionsView } from "./LeadQuestionsView";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import LeadHistory from "./LeadHistory"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import Spinner from "../ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignatureDialog } from "@/components/EstimateForm/SignatureDialog";

// EstimateLockBanner Component
const EstimateLockBanner = ({ isLocked, onUnlock, className = "" }) => {
  if (!isLocked) return null;
  
  return (
    <div className={`bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 flex justify-between items-center ${className}`}>
      <div className="flex items-center">
        <LockIcon className="text-amber-500 mr-3 h-5 w-5" />
        <div>
          <p className="text-amber-800 font-medium">This estimate is locked</p>
          <p className="text-amber-700 text-sm">The client has signed this estimate. You need to unlock it before making changes.</p>
        </div>
      </div>
      <Button 
        variant="outline" 
        className="bg-white border-amber-500 text-amber-700 hover:bg-amber-50"
        onClick={onUnlock}
      >
        <UnlockIcon className="mr-2 h-4 w-4" />
        Unlock Estimate
      </Button>
    </div>
  );
};

// UnlockConfirmDialog Component
const UnlockConfirmDialog = ({ isOpen, onClose, onConfirm }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlock Signed Estimate?</AlertDialogTitle>
          <AlertDialogDescription>
            This estimate has been signed by the client. Unlocking it will allow you to make changes, 
            but the client will need to sign it again. Are you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Unlock Estimate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
  urlContractorId?: string | null;
}

export const LeadDetailsDialog = ({ lead: initialLead, onClose, open, urlContractorId }: LeadDetailsDialogProps) => {
    const [view, setView] = useState<"estimate" | "questions" | "history">("estimate");
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState<any>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  // State for estimate locking
  const [isEstimateLocked, setIsEstimateLocked] = useState(false);
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  // New state for contractor signature dialog
  const [showContractorSignatureDialog, setShowContractorSignatureDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Extract leadId from URL query parameters
  const searchParams = new URLSearchParams(location.search);
  const leadIdFromUrl = searchParams.get('leadId');
  
  // State to hold the lead data
  const [lead, setLead] = useState<Lead | null>(initialLead);
  

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
  const effectiveContractorId = urlContractorId || currentUser?.id;

  // Fetch lead data if we have a leadId in the URL
  const { data: fetchedLead, isLoading: isLoadingLead, refetch: refetchLead } = useQuery({
    queryKey: ['lead', leadIdFromUrl],
    queryFn: async () => {
      if (!leadIdFromUrl) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select('*, client_signature, client_signature_date, contractor_signature, contractor_signature_date')
        .eq('id', leadIdFromUrl)
        .single();
        
      if (error) throw error;
      
      console.log("Fetched lead with signatures:", data);
      return data as Lead;
    },
    enabled: !!leadIdFromUrl,
  });

  // Fetch contractor data using the effective ID
  const { data: contractor, isLoading: isLoadingContractor } = useQuery({
    queryKey: ['contractor', effectiveContractorId],
    queryFn: async () => {
      if (!effectiveContractorId) throw new Error('No contractor ID available');

      const { data, error: dbError } = await supabase
        .from('contractors')
        .select('*')
        .eq('id', effectiveContractorId)
        .maybeSingle(); 
      if (dbError) throw dbError;
      if (!data) throw new Error('No contractor found');
      return data;
    },
    enabled: !!effectiveContractorId
  });

  // Initialize editedEstimate with deep copy when lead changes
  useEffect(() => {
    if (initialLead?.estimate_data) {
      const deepCopy = JSON.parse(JSON.stringify(initialLead.estimate_data));
      setEditedEstimate(deepCopy);
    }
  }, [initialLead]);

  // Update lead state when initialLead changes
  useEffect(() => {
    if (initialLead) {
      setLead(initialLead);
      
      // Update URL with the leadId to support reloads
      if (initialLead.id && !leadIdFromUrl) {
        navigate(`${location.pathname}?leadId=${initialLead.id}`, { replace: true });
      }
    }
  }, [initialLead, leadIdFromUrl, navigate, location.pathname]);

  // Update lead state when fetchedLead changes
  useEffect(() => {
    if (fetchedLead) {
      console.log("Setting lead from fetchedLead:", fetchedLead);
      setLead(fetchedLead);
      
      // Deep copy estimate data to avoid reference issues
      if (fetchedLead.estimate_data) {
        const deepCopy = JSON.parse(JSON.stringify(fetchedLead.estimate_data));
        setEditedEstimate(deepCopy);
      }
    }
  }, [fetchedLead]);

  // Check if estimate is locked (client has signed)
  useEffect(() => {
    if (lead?.client_signature) {
      setIsEstimateLocked(true);
    } else {
      setIsEstimateLocked(false);
    }
  }, [lead?.client_signature]);

  // Update email recipient when lead changes
  useEffect(() => {
    if (lead?.user_email) {
      setEmailRecipient(lead.user_email);
    }
  }, [lead?.user_email]);

  // Function to handle contractor signature
  const handleContractorSignature = async (signature: string) => {
    if (!lead || !effectiveContractorId) return;
    
    try {
      // Update the lead with the contractor signature
      const { error: dbError } = await supabase
         .from("leads")
         .update({
           contractor_signature: signature,
           contractor_signature_date: new Date().toISOString(),
           status: "approved"
         })
         .eq("id", lead.id);
      if (dbError) throw dbError;
      
      // Refresh lead data
      refetchLead();
      
      // Show success toast
      toast({
        title: "Success",
        description: "Your signature has been added to the estimate.",
      });
      
      // Close the signature dialog
      setShowContractorSignatureDialog(false);
    } catch (error) {
      console.error('Error adding contractor signature:', error);
      toast({
        title: "Error",
        description: "Failed to add signature. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelLead = async () => {
    if (!lead) return;
    setIsCancelling(true);
    try {
      const { error: dbError } = await supabase
        .from("leads")
        .update({ status: "cancelled" })
        .eq("id", lead.id);

      if (dbError) throw dbError;

      toast({ title: "Lead cancelled", description: "Status set to \"cancelled\"." });
      queryClient.invalidateQueries(["lead", lead.id]);
      queryClient.invalidateQueries(["leads"]);
    } catch (err) {
      toast({ title: "Error", description: "Could not cancel lead.", variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleArchiveLead = async () => {
    if (!lead) return;
    setIsCancelling(true);          // reuse same spinner flag
    try {
      const { error: dbError } = await supabase
        .from("leads")
        .update({ status: "archived" })
        .eq("id", lead.id);

      if (dbError) throw dbError;

      toast({ title: "Lead archived", description: "Status set to \"archived\"." });
      queryClient.invalidateQueries(["lead", lead.id]);
      queryClient.invalidateQueries(["leads"]);
    } catch (err) {
      toast({ title: "Error", description: "Could not archive lead.", variant: "destructive" });
    } finally {
      setIsCancelling(false);
    }
  };

  // Function to handle unlocking the estimate
  const handleUnlockEstimate = async () => {
    if (!lead || !effectiveContractorId) return;
    
    try {
      // Update the lead to remove client signature
     const { error: dbError } = await supabase
        .from('leads')
        .update({
          client_signature: null,
          client_signature_date: null
        })
        .eq('id', lead.id);
      
      if (dbError) throw dbError;
      
      // Update local state
      setIsEstimateLocked(false);
      
      // Close dialog
      setShowUnlockDialog(false);
      
      // Refresh lead data
      refetchLead();
      
      // Show toast
      toast({
        title: "Estimate unlocked",
        description: "You can now edit this estimate. The client will need to sign it again.",
      });
    } catch (error) {
      console.error('Error unlocking estimate:', error);
      toast({
        title: "Error",
        description: "Failed to unlock estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

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
      console.log('Edited estimate data:', editedEstimate);

      // Create a properly structured update payload
      const updatePayload = {
        project_title: lead.project_title,
        project_description: lead.project_description,
        estimate_data: editedEstimate,
        estimated_cost: editedEstimate.totalCost
      };

      console.log("Saving with payload:", updatePayload);

      // Update the lead without trying to select in the same query
      const { error: dbError } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id);

      if (dbError) {
        console.error('Update error:', dbError);
        throw dbError;
      }

      // Manually fetch the updated lead
      const { data: updatedLead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead.id)
        .single();
        
      if (fetchError) {
        console.error('Error fetching updated lead:', fetchError);
        throw fetchError;
      }

      // Update local state with the fresh data
      setLead(updatedLead as Lead);
      
      // Make a deep copy of the estimate data
      if (updatedLead.estimate_data) {
        const deepCopy = JSON.parse(JSON.stringify(updatedLead.estimate_data));
        setEditedEstimate(deepCopy);
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['lead', lead.id]);
      queryClient.invalidateQueries(['leads']);

      toast({
        title: "Success",
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!lead) return;
    
    setIsDeleting(true);
    
    try {
      // Delete lead from database
      const { error: dbError } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);
      
      if (dbError) throw dbError;
      
      // Show success toast
      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leads']);
      
      // Close the dialogs
      setShowDeleteDialog(false);
      handleCloseDialog();
      
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

  const handleDuplicateLead = async () => {
    if (!lead || !effectiveContractorId) return;
    
    setIsDuplicating(true);
    
    try {
      // Create a deep copy of the lead to avoid reference issues
      const leadCopy = JSON.parse(JSON.stringify(lead));
      
      // Remove unique identifiers and timestamps
      delete leadCopy.id;
      delete leadCopy.created_at;
      delete leadCopy.updated_at;
      
      // Update title to indicate it's a duplicate
      leadCopy.project_title = `${leadCopy.project_title} (Copy)`;
      
      // Ensure contractor ID is set
      leadCopy.contractor_id = effectiveContractorId;
      
      // Insert the duplicate lead
      const { data, error } = await supabase
        .from('leads')
        .insert(leadCopy)
        .select();
      
      if (error) throw error;
      
      // Show success toast
      toast({
        title: "Success",
        description: "Lead duplicated successfully",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['leads']);
      
      // Navigate to the new lead
      if (data && data.length > 0) {
        navigate(`${location.pathname}?leadId=${data[0].id}`, { replace: true });
        handleCloseDialog();
      }
      
    } catch (error) {
      console.error('Error duplicating lead:', error);
      toast({
        title: "Error",
        description: "Failed to duplicate lead. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailRecipient || !lead || !effectiveContractorId) {
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
    if (!lead) return;
    
    const estimateUrl = `${window.location.origin}/e/${lead.id}`;
    navigator.clipboard.writeText(estimateUrl).then(() => {
      toast({
        title: "Link copied",
        description: "The estimate link has been copied to your clipboard.",
      });
    });
  };

  const handleCloseDialog = () => {
    // Remove the leadId from URL when closing
    if (leadIdFromUrl) {
      navigate(location.pathname, { replace: true });
    }
    
    // Exit edit mode if active
    if (isEditing) {
      setIsEditing(false);
    }
    
    onClose();
  };

  const handleEstimateChange = (updated: any) => {
    if (updated) {
      // Use a fresh object to avoid reference issues
      const newEstimate = {
        ...editedEstimate,
        groups: updated.groups,
        totalCost: updated.totalCost
      };
      setEditedEstimate(newEstimate);
    }
  };

  const renderActionButtons = () => {
    if (isEditing) {
      return (
        <div className="flex justify-end items-center space-x-2">
          <Button 
            variant="outline"
            onClick={() => {
              setIsEditing(false);
              // Reset edited estimate to original values
              if (lead?.estimate_data) {
                const deepCopy = JSON.parse(JSON.stringify(lead.estimate_data));
                setEditedEstimate(deepCopy);
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEstimate} 
            disabled={isSaving || (!effectiveContractorId || (isLoadingUser && !urlContractorId))}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      );
    }

    const isLoading = !urlContractorId && isLoadingUser;
    const disabled = isLoading || !effectiveContractorId;

    return (
      <div className="flex justify-end items-center">
        <div className="inline-flex -space-x-px rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse">
          {isEstimateLocked ? (
            // If estimate is locked (client has signed), show locked button
            <Button 
              className="rounded-none shadow-none first:rounded-s-lg focus-visible:z-10"
              variant="outline"
              disabled={true}
              title="Estimate is locked - client has signed"
            >
              <LockIcon className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              Locked
            </Button>
          ) : (
            // If estimate is not locked, show normal edit button
            <Button 
              className="rounded-none shadow-none first:rounded-s-lg focus-visible:z-10"
              variant="outline"
              onClick={() => setIsEditing(true)}
              disabled={disabled}
            >
              <Edit className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
              Edit
            </Button>
          )}
          <Button 
            className="rounded-none shadow-none focus-visible:z-10"
            variant="outline"
            onClick={() => setShowEmailDialog(true)}
            disabled={disabled}
          >
            <Mail className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
            Email
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="rounded-none shadow-none last:rounded-e-lg focus-visible:z-10 px-4"
                variant="outline"
                aria-label="More options"
                disabled={disabled}
              >
                <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={handleDuplicateLead}
                disabled={isDuplicating}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicate Lead
              </DropdownMenuItem>
              {isEstimateLocked && (
                <DropdownMenuItem
                  onClick={() => setShowUnlockDialog(true)}
                  className="cursor-pointer"
                >
                  <UnlockIcon className="mr-2 h-4 w-4" />
                  Unlock Estimate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleArchiveLead}
                disabled={isCancelling}
                className="cursor-pointer"
              >
                <Copy className="mr-2 h-4 w-4 rotate-90" />
                Archive Lead
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive cursor-pointer focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  // Show loading state while fetching lead or contractor
  if ((isLoadingLead && leadIdFromUrl) || (isLoadingUser && !urlContractorId) || isLoadingContractor) {
    return (
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-full h-[100vh] p-0 m-0">
          <DialogTitle className="sr-only">Lead Details</DialogTitle>
          <DialogDescription className="sr-only">View and manage lead details</DialogDescription>
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Don't render if no lead data is available
  if (!lead && !isLoadingLead) {
    return (
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-full h-[100vh] p-0 m-0">
          <DialogTitle className="sr-only">Lead Details</DialogTitle>
          <DialogDescription className="sr-only">View and manage lead details</DialogDescription>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p>No lead data available. The lead may have been deleted.</p>
              <Button onClick={handleCloseDialog} className="mt-4">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-full h-[100vh] p-0 m-0">
          <DialogTitle className="sr-only">Lead Details</DialogTitle>
          <DialogDescription className="sr-only">View and manage lead details</DialogDescription>
          <div className="flex flex-col h-full relative overflow-y-scroll pb-20">
            {isMobile ? (
              <div className="sticky top-0 z-50 bg-white border-b">
                <button
                  onClick={handleCloseDialog}
                  className="absolute right-4 top-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                  </button>
                <div className="h-14" />
              </div>
            ) : (
              <button
                onClick={handleCloseDialog}
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
            {view === "history" && <LeadHistory leadId={lead.id} />}


            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0' : 'p-6'}`}>
              <div className="max-w-6xl mx-auto pt-6">
                {view === "estimate" && lead && (
                  <>
                    {isEstimateLocked && (
                      <EstimateLockBanner 
                        isLocked={isEstimateLocked} 
                        onUnlock={() => setShowUnlockDialog(true)} 
                        className="mb-4" 
                      />
                    )}
                    {renderActionButtons()}
                    <div className="mt-4">
                      <EstimateDisplay 
                        groups={isEditing ? editedEstimate?.groups || [] : lead.estimate_data?.groups || []}
                        totalCost={isEditing ? editedEstimate?.totalCost || 0 : lead.estimate_data?.totalCost || 0}
                        projectSummary={lead.project_description}
                        isEditable={isEditing}
                        onEstimateChange={handleEstimateChange}
                        contractor={contractor}
                        contractorParam={contractor?.id}
                        handleRefreshEstimate={() => refetchLead()}
                        leadId={lead.id}
                        handleContractSign={() => setShowContractorSignatureDialog(true)}
                        isLeadPage={true} // Explicitly set this to true for the lead details page
                        lead={lead} 
                        isEstimateLocked={isEstimateLocked}
                        onCancel={handleCancelLead}
                        onArchive={handleArchiveLead}
                      />
                    </div>
                  </>
                )}
                {view === "questions" && (
                  <LeadQuestionsView lead={lead} refetchLead={refetchLead} />
                )}
              </div>
            </div>

            {/* Bottom Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
              <div className="container max-w-6xl mx-auto">
                <div className="inline-flex -space-x-px rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse w-full">
                  <Button 
                    variant="outline" 
                    className="rounded-none shadow-none first:rounded-s-lg focus-visible:z-10 flex-1"
                  >
                    <Phone className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
                    Call
                  </Button>
                  <Button 
                    variant="outline" 
                    className="rounded-none shadow-none focus-visible:z-10 flex-1"
                  >
                    <MessageSquare className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
                    Text
                  </Button>
                  
                    </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
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
            <AlertDialogAction
              onClick={handleSendEmail}
              disabled={isLoadingUser || !currentUser}
            >
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLead}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Lead"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unlock Confirmation Dialog */}
      <UnlockConfirmDialog 
        isOpen={showUnlockDialog}
        onClose={() => setShowUnlockDialog(false)}
        onConfirm={handleUnlockEstimate}
      />

      {/* Contractor Signature Dialog */}
      <SignatureDialog
        isOpen={showContractorSignatureDialog}
        onClose={() => setShowContractorSignatureDialog(false)}
        onSign={handleContractorSignature}
        contractorId={effectiveContractorId}
        leadId={lead?.id}
        estimateData={lead?.estimate_data}
        isContractorSignature={true} // Important: set to true for contractor signature
      />
    </>
  );
};