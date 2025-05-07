import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Phone, MessageSquare, Download, FileSpreadsheet, Mail, X, Edit, Link, Trash2 } from "lucide-react";
import type { Lead } from "./LeadsTable";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { LeadViewToggle } from "./LeadViewToggle";
import { LeadQuestionsView } from "./LeadQuestionsView";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, useLocation } from "react-router-dom";
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

interface LeadDetailsDialogProps {
  lead: Lead | null;
  onClose: () => void;
  open: boolean;
  urlContractorId?: string | null;
}

export const LeadDetailsDialog = ({ lead: initialLead, onClose, open, urlContractorId }: LeadDetailsDialogProps) => {
  const [view, setView] = useState<"estimate" | "questions">("estimate");
  const [isEditing, setIsEditing] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState<any>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
        .select('*')
        .eq('id', leadIdFromUrl)
        .single();
        
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!leadIdFromUrl,
  });

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

  // Update email recipient when lead changes
  useEffect(() => {
    if (lead?.user_email) {
      setEmailRecipient(lead.user_email);
    }
  }, [lead?.user_email]);

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
      const { error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', lead.id);

      if (error) {
        console.error('Update error:', error);
        throw error;
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
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', lead.id);
      
      if (error) throw error;
      
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
    console.log("Estimate changed:", updated);
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
            Edit
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
            variant="destructive" 
            onClick={() => setShowDeleteDialog(true)} 
            className="w-full gap-2"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      );
    }

    return (
      <div className="w-full grid grid-cols-3 gap-4">
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
          variant="destructive" 
          onClick={() => setShowDeleteDialog(true)} 
          className="w-full gap-2"
          disabled={disabled}
        >
          <Trash2 className="h-4 w-4" />
          Delete Lead
        </Button>
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

            <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0' : 'p-6'}`}>
              <div className="max-w-6xl mx-auto pt-6">
                {view === "estimate" && lead && (
                  <>
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
                        handleContractSign={() => {}}
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
    </>
  );
};