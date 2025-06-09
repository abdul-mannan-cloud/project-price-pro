import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { Textarea } from "@/components/ui/textarea"
//import { Switch } from "@/components/ui/switch"; 
import {
  Phone,
  MessageSquare,
  Send,
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
import { Checkbox } from "@/components/ui/checkbox";
import Spinner from "../ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignatureDialog } from "@/components/EstimateForm/SignatureDialog";
import { set } from "date-fns";

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
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  // --- refresh-estimate -------------------------------------------------------
//const [isRefreshingEstimate, setIsRefreshingEstimate] = useState(false);

/**
 * Ask the edge-function to rebuild the estimate, then pull the fresh row
 */
const [isRefreshingEstimate, setIsRefreshingEstimate] = useState(false);

// check poll-status exactly like useEstimateFlow does
const waitForEstimateReady = async (
  leadId: string,
  maxAttempts = 10,
  sleep = 3000
) => {
  let count = 0;
  while (count < maxAttempts) {
    const { data, error } = await supabase
      .from("leads")
      .select("status, estimate_data")
      .eq("id", leadId)
      .maybeSingle();
    if (error) throw error;
    if (data?.status === "complete" && data.estimate_data) return true;
    await new Promise((r) => setTimeout(r, sleep));
    count++;
  }
  return false;
};

/**
+ * Same refresh routine that EstimatePage uses
+ */
const refreshEstimate = async (leadId: string) => {
  if (!leadId) return;
  setIsRefreshingEstimate(true);

  try {
    toast({ title: "Refreshing", description: "Generating a new estimate…" });

    // kick off the edge-function
    const { error } = await supabase.functions.invoke("generate-estimate", {
      body: { leadId, contractorId: effectiveContractorId },
    });
    if (error) throw error;

    // wait until the row flips back to “complete”
    const ready = await waitForEstimateReady(leadId);
    if (!ready) {
      toast({
        title: "Still working",
       description:
          "Generation is taking longer than usual – try again in a minute.",
      });
    }

    await refetchLead(); // pull the fresh data into the UI

    toast({
      title: "Estimate updated",
      description: "The latest numbers are now showing.",
    });
  } catch (err) {
    console.error(err);
    toast({
      title: "Error",
      description: "Could not refresh estimate – please try again.",
      variant: "destructive",
    });
  } finally {
    setIsRefreshingEstimate(false);
  }
};
  const [isSending, setIsSending] = useState(false);

  // Send options state
  const [sendOptions, setSendOptions] = useState({
    email: false,
    sms: false,
    copyLink: false
  });

  // State for estimate locking
  //const [isEstimateLocked, setIsEstimateLocked] = useState(false);
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
  // Per-lead signature flag (no local toggle)
const signatureEnabled = lead?.signature_enabled ?? true;

// Add near the top of the component, with your other useState:


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
         .select(`
   *,
   client_signature,
   client_signature_date,
   contractor_signature,
   contractor_signature_date,
   signature_enabled
 `)
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
        .eq('user_id', effectiveContractorId)
        .eq('tier',    'enterprise')
        .maybeSingle(); 
        console.log(contractor) 
        
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
// ✅ new — always reflects the current lead state
// at the top, alongside your other useState calls
const [isEstimateLocked, setIsEstimateLocked] = useState(true);

// reset to locked whenever the lead changes (i.e. on dialog open or refresh)
useEffect(() => {
  setIsEstimateLocked(true);
}, [lead?.id]);



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

      const { data: contractor} = await supabase
          .from('contractors')
          .select('*')
          .eq('id', lead.contractor_id)
          .single();

      let projectTitle = ''
      for (const group in lead.estimate_data?.groups){
        projectTitle += ` - ${lead.estimate_data?.groups[group].title}`;
      }

      const { error: smsSendError } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'contractor_signed',
          phone: contractor.contact_phone,
          data: {
            businessName: contractor.business_name || "Your Contractor",
            estimatePageUrl: `${window.location.origin}/e/${lead.id}`,
            projectTitle:projectTitle
          }
        }
      });

      if (smsSendError) {
        console.error("Failed to send contractor SMS", smsSendError);
      } else {
        console.log("Contractor SMS sent successfully");
      }


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
  if (!lead) return;

  try {
    // remove client_signature in DB
    const { error: dbError } = await supabase
      .from('leads')
      .update({ client_signature: null, client_signature_date: null })
      .eq('id', lead.id);
    if (dbError) throw dbError;

    // **unlock for this session**
    setIsEstimateLocked(false);

    // close the confirmation dialog
    setShowUnlockDialog(false);

    // refetch so the signature truly disappears
    refetchLead();

    toast({
      title: "Estimate unlocked",
      description: "You can now edit this estimate. The client will need to sign again.",
    });
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to unlock estimate. Please try again.",
      variant: "destructive",
    });
  }
};
const handleLockEstimate = () => {
  setIsEstimateLocked(true);
  toast({
    title: "Estimate locked",
    description: "The estimate is locked again—you’ll need to unlock to edit.",
  });
};


// ── add this helper right above handleSaveEstimate ─────────────────────────
// ── simplified validation: only require each item to be fully filled out ─────────────────────
const validateEstimate = () => {
  if (!editedEstimate?.groups?.length) return false;
  for (const group of editedEstimate.groups) {
    for (const subgroup of group.subgroups) {
      for (const item of subgroup.items) {
        // title must be non-empty and not our placeholder
        if (!item.title?.trim() || item.title === "New Item") return false;
        // description must be non-empty
        if (!item.description?.trim()) return false;
        // unit price must be > 0
        if (Number(item.unitAmount) <= 0) return false;
      }
    }
  }
  return true;
};


// ── replace your handleSaveEstimate with this ───────────────────────────────
const handleSaveEstimate = async () => {
  // 1) quick validation before even trying to save
  if (!validateEstimate()) {
    toast({
      title: "Missing or invalid fields",
      description: "Please fill out every title, description, and set a unit price > 0 before saving.",
      variant: "destructive",
    });
    return;
  }

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
    const updatePayload = {
      project_title: lead.project_title,
      project_description: lead.project_description,
      estimate_data: editedEstimate,
      estimated_cost: editedEstimate.totalCost
    };

    const { error: dbError } = await supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', lead.id);

    if (dbError) throw dbError;

    // Refresh local data
    const { data: updatedLead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead.id)
      .single();
    if (fetchError) throw fetchError;

    setLead(updatedLead);
    setEditedEstimate(JSON.parse(JSON.stringify(updatedLead.estimate_data)));

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
      description: "Failed to save estimate. Please try again.",
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

      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  };

  const handleSendSMS = async () => {
    if (!lead?.user_phone || !lead || !effectiveContractorId) {
      return false;
    }

    try {
      let projectTitle = '';
      for (const group in lead.estimate_data?.groups) {
        projectTitle += ` - ${lead.estimate_data?.groups[group].title}`;
      }

      const { error: smsSendError } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'estimate_sent',
          phone: lead.user_phone,
          data: {
            businessName: contractor?.business_name || "Your Contractor",
            estimatePageUrl: `${window.location.origin}/e/${lead.id}`,
            businessOwnerFullName: contractor?.business_owner_name || contractor?.business_name || "Your Contractor",
            businessPhone: contractor?.contact_phone || "N/A",
            businessEmail: contractor?.contact_email || "N/A",
            projectTitle: projectTitle
          }
        }
      });

      if (smsSendError) {
        console.error("Failed to send SMS", smsSendError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  };

  const handleSendEstimate = async () => {
    if (!lead || !effectiveContractorId) {
      toast({
        title: "Error",
        description: "Unable to send estimate. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Check if at least one option is selected
    const hasSelectedOption = sendOptions.email || sendOptions.sms || sendOptions.copyLink;
    if (!hasSelectedOption) {
      toast({
        title: "Error",
        description: "Please select at least one sending option.",
        variant: "destructive",
      });
      return;
    }

    // Validate email if email option is selected
    if (sendOptions.email && !emailRecipient) {
      toast({
        title: "Error",
        description: "Please provide an email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const results = {
        email: false,
        sms: false,
        copyLink: false
      };

      // Handle email sending
      if (sendOptions.email) {
        results.email = await handleSendEmail();
      }

      // Handle SMS sending
      if (sendOptions.sms) {
        results.sms = await handleSendSMS();
      }

      // Handle copy link
      if (sendOptions.copyLink) {
        const estimateUrl = `${window.location.origin}/e/${lead.id}`;
        try {
          await navigator.clipboard.writeText(estimateUrl);
          results.copyLink = true;
        } catch (error) {
          console.error('Error copying link:', error);
          results.copyLink = false;
        }
      }

      // Show success/error messages based on results
      const successfulActions = [];
      const failedActions = [];

      if (sendOptions.email) {
        if (results.email) successfulActions.push('Email');
        else failedActions.push('Email');
      }
      if (sendOptions.sms) {
        if (results.sms) successfulActions.push('SMS');
        else failedActions.push('SMS');
      }
      if (sendOptions.copyLink) {
        if (results.copyLink) successfulActions.push('Link copied');
        else failedActions.push('Copy link');
      }

      if (successfulActions.length > 0) {
        toast({
          title: "Success",
          description: `${successfulActions.join(', ')} sent successfully.`,
        });
      }

      if (failedActions.length > 0) {
        toast({
          title: "Partial Success",
          description: `Failed to send: ${failedActions.join(', ')}. Please try again.`,
          variant: "destructive",
        });
      }

      // Close dialog if at least one action was successful
      if (successfulActions.length > 0) {
        setShowSendDialog(false);
        // Reset form
        setSendOptions({ email: false, sms: false, copyLink: false });
      }

    } catch (error) {
      console.error('Error sending estimate:', error);
      toast({
        title: "Error",
        description: "Failed to send estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
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
  // ── 1) EDIT MODE ───────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="flex justify-end items-center space-x-2">
        <Button
          variant="outline"
          onClick={() => {
            setIsEditing(false);
            if (lead?.estimate_data) {
              setEditedEstimate(JSON.parse(JSON.stringify(lead.estimate_data)));
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

  // ── 2) LOCKED STATE ────────────────────────────────────────────────────────
  // no action buttons here—unlock lives in the banner
  if (isEstimateLocked) {
    return null;
  }

  // ── 3) UNLOCKED STATE ─────────────────────────────────────────────────────
  const isLoading = !urlContractorId && isLoadingUser;
  const disabled = isLoading || !effectiveContractorId;

  return (
    <div className="flex justify-end items-center space-x-2">
      <Button
        variant="outline"
        onClick={() => setIsEditing(true)}
        disabled={disabled}
      >
        <Edit className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} />
        Edit
      </Button>
      <Button
          variant="outline"
          onClick={() => setShowSendDialog(true)}
          disabled={disabled}
      >
        <Send className="-ms-1 me-2 opacity-60" size={16} strokeWidth={2} aria-hidden="true" />
        Send
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className="px-4"
            aria-label="More options"
          >
            <MoreHorizontal size={16} strokeWidth={2} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleDuplicateLead} disabled={isDuplicating}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Lead
          </DropdownMenuItem>
            {!isEstimateLocked && (
    <DropdownMenuItem onClick={handleLockEstimate}>
      <LockIcon className="mr-2 h-4 w-4" />
      Lock Estimate
    </DropdownMenuItem>
  )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCancelLead} className="text-destructive">
            <X className="mr-2 h-4 w-4" />
            Cancel Lead
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleArchiveLead} disabled={isCancelling}>
            <Copy className="mr-2 h-4 w-4 rotate-90" />
            Archive Lead
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
          <div className="flex flex-col h-full relative overflow-hidden pb-20">

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
            {/* put all three views into the same scrollable panel */}
<div className={`flex-1 overflow-y-auto ${isMobile ? 'p-0' : 'p-6'}`}>
  <div className="max-w-6xl mx-auto pt-6 space-y-6">
    {view === "history" && (
      <LeadHistory leadId={lead.id} />
    )}

    {view === "estimate" && lead && (
  <>
    {/* ── Per-lead signature toggle ─────────────────────────────── */}
    
    {/* ── Locked banner shows only if per-lead flag AND locked ── */}
    {isEstimateLocked && (
      <EstimateLockBanner
        isLocked={isEstimateLocked}
        onUnlock={() => setShowUnlockDialog(true)}
        className="mb-4"
      />
    )}

    {/* ── Existing buttons & display ───────────────────────────── */}
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
       // handleRefreshEstimate={() => refetchLead()}
       handleRefreshEstimate={refreshEstimate}
        leadId={lead.id}
        handleContractSign={() => lead.signature_enabled && setShowContractorSignatureDialog(true)}
        isLeadPage={true}
        lead={lead}
        isEstimateLocked={isEstimateLocked}
        signatureEnabled={lead?.signature_enabled ?? true}
      />
    </div>
  </>
)}

    {view === "questions" && (
      <LeadQuestionsView lead={lead} refetchLead={refetchLead} />
    )}
  </div>
</div>
 {isRefreshingEstimate && (
   <div className="absolute inset-0 bg-background/70 flex items-center justify-center z-50">
     <p className="animate-pulse text-sm">Refreshing estimate…</p>
   </div>
 )}
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

        {/* Send Options Dialog */}
        <AlertDialog open={showSendDialog} onOpenChange={setShowSendDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Now</AlertDialogTitle>
              <AlertDialogDescription>
                How would you like to send the estimate to {lead?.user_name}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              {/* Email Option */}
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                      id="email"
                      checked={sendOptions.email}
                      onCheckedChange={(checked) =>
                          setSendOptions(prev => ({ ...prev, email: !!checked }))
                      }
                      className="rounded-none"
                  />
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                </div>
                {sendOptions.email ? (
                    <Input
                        type="email"
                        placeholder="Add email"
                        value={emailRecipient}
                        onChange={(e) => setEmailRecipient(e.target.value)}
                        className="flex-1 max-w-xs"
                    />
                ) : (
                    <span className="text-sm text-blue-600 cursor-pointer"
                          onClick={() => setSendOptions(prev => ({ ...prev, email: true }))}>
                  Add email
                </span>
                )}
              </div>

              {/* SMS Option */}
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                      id="sms"
                      checked={sendOptions.sms}
                      onCheckedChange={(checked) =>
                          setSendOptions(prev => ({ ...prev, sms: !!checked }))
                      }
                      className="rounded-none"
                  />
                  <label htmlFor="sms" className="text-sm font-medium">
                    SMS
                  </label>
                </div>
                <span className="text-sm text-gray-500">
                {lead?.user_phone || "No phone number"}
              </span>
              </div>

              {/* Copy Link Option */}
              <div className="flex items-center justify-between space-x-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                      id="copyLink"
                      checked={sendOptions.copyLink}
                      onCheckedChange={(checked) =>
                          setSendOptions(prev => ({ ...prev, copyLink: !!checked }))
                      }
                      className="rounded-none"
                  />
                  <label htmlFor="copyLink" className="text-sm font-medium">
                    Share
                  </label>
                </div>
                <span className="text-sm text-blue-600 cursor-pointer">
                Copy link
              </span>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                  onClick={handleSendEstimate}
                  disabled={isSending || isLoadingUser || !currentUser}
              >
                {isSending ? "Sending..." : "Send"}
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
      {signatureEnabled && <SignatureDialog
        isOpen={showContractorSignatureDialog}
        onClose={() => setShowContractorSignatureDialog(false)}
        onSign={handleContractorSignature}
        contractorId={effectiveContractorId}
        leadId={lead?.id}
        estimateData={lead?.estimate_data}
        isContractorSignature={true} // Important: set to true for contractor signature
      />
}


    </>
  );
};