import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTemplateStyles } from "@/lib/template-styles";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SignatureDialog } from "./SignatureDialog";
import { EstimateSkeleton } from "./EstimateSkeleton";
import { EstimateAnimation } from "./EstimateAnimation";
import { EstimateHeader } from "./EstimateHeader";
import { EstimateActions } from "./EstimateActions";
import { EstimateTable } from "./EstimateTable";
import { EstimateTotals } from "./EstimateTotals";
import { EstimateSignature } from "./EstimateSignature";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, MinusCircle, Save } from "lucide-react";
//import { Switch } from "@/components/ui/switch";
import { useQueryClient } from '@tanstack/react-query'
export interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  costType: string;
  unitAmount: string;
  totalPrice: number;
}

export interface SubGroup {
  name: string;
  items: LineItem[];
  subtotal: number;
}

export interface ItemGroup {
  name: string;
  description?: string;
  subgroups: SubGroup[];
  subtotal?: number;
}

export type ContractorDisplay = {
  id?: string;
  business_name?: string;
  business_logo_url?: string | null;
  contact_email?: string;
  contact_phone?: string | null;
  branding_colors?: Json | null;
  tier?: string;
  cash_credits?: number;
  stripe_customer_id?: string;
  contractor_settings?: {
    estimate_template_style?: string;
    estimate_client_message?: string;
    estimate_footer_text?: string;
    estimate_signature_enabled?: boolean;
    estimate_hide_subtotals?: boolean;
    estimate_compact_view?: boolean;
  };
};

interface ContractorSettings {
  estimate_template_style?: string;
  estimate_client_message?: string;
  estimate_footer_text?: string;
  estimate_signature_enabled?: boolean;
  estimate_hide_subtotals?: boolean;
  estimate_compact_view?: boolean;
  tax_rate?: number;
}


interface EstimateDisplayProps {
  groups: ItemGroup[];
  totalCost: number;
  isBlurred?: boolean;
  contractor?: ContractorDisplay;
  projectSummary?: string;
  isEditable?: boolean;
  onEstimateChange?: (estimate: any) => void;
  onSignatureComplete?: (initials: string) => void;
  projectImages?: string[];
  estimate?: any;
  isLoading?: boolean;
  handleRefreshEstimate: (id: string) => void;
  leadId: string;
  contractorParam?: string;
  handleContractSign: (leadId: string) => void;
  isLeadPage?: boolean;
  lead?: any;
  isEstimateLocked?: boolean;
  onCancel?: () => void;
  onArchive?: () => void;
  signatureEnabled?: boolean;
  // New props from the code snippet
  setIsEditing?: (isEditing: boolean) => void;
  setEditedEstimate?: (estimate: any) => void;
  handleSaveEstimate?: () => void;
  isSaving?: boolean;
  effectiveContractorId?: string;
  isLoadingUser?: boolean;
  urlContractorId?: string;
}

export const EstimateDisplay = ({
  groups = [],
  totalCost = 0,
  isBlurred = false,
  contractor: contractorProp,
  projectSummary,
  isEditable = false,
  onEstimateChange,
  onSignatureComplete,
  projectImages = [],
  estimate,
  isLoading: initialLoading = false,
  handleRefreshEstimate,
  leadId,
  contractorParam,
  handleContractSign,
  isLeadPage = false,
  lead = null,
  isEstimateLocked = false,
  onCancel,
  signatureEnabled = true,
  onArchive,
  // New props with default values
  setIsEditing,
  setEditedEstimate,
  handleSaveEstimate,
  isSaving = false,
  effectiveContractorId,
  isLoadingUser = false,
  urlContractorId
}: EstimateDisplayProps) => {
  const [editableGroups, setEditableGroups] = useState<ItemGroup[]>([]);
  const [editableTotalCost, setEditableTotalCost] = useState(totalCost);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const [contractorId, setContractorId] = useState<string>(contractorParam ?? "");
  const [contractor, setContractor] = useState<ContractorDisplay | undefined>(contractorProp);
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isEstimateReady, setIsEstimateReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [showSignatureSection, setShowSignatureSection] = useState(false);
  // Check if the screen is mobile-sized
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");
 const [leadSigEnabled, setLeadSigEnabled] = useState(signatureEnabled);
 // ── keep toggle state in-sync with new data ──────────────────────────


const queryClient = useQueryClient();
  const toggleLeadSignature = async (checked: boolean) => {
    if (!leadId) return;
    const patch: any = { signature_enabled: checked };
    if (!checked) {
      patch.client_signature = null;
      patch.client_signature_date = null;
      patch.contractor_signature = null;
      patch.contractor_signature_date = null;
    }
    const { error } = await supabase
      .from("leads")
      .update(patch)
      .eq("id", leadId);
    if (error) {
      toast({
        title: "Error",
        description: "Failed to update lead.",
        variant: "destructive",
      });
    } else {
      setLeadSigEnabled(checked);
      //handleRefreshEstimate(leadId);          // re-fetch
      queryClient.invalidateQueries({ queryKey: ['estimate-status', leadId] });
    queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      toast({
        title: "Updated",
        description: `Signature section ${
          checked ? "enabled" : "disabled"
        } for this lead.`,
      });
    }
  };
  // Update contractor state when prop changes
  useEffect(() => {
    if (contractorProp) {
      setContractor(contractorProp);
      if (contractorProp.id) {
        setContractorId(contractorProp.id);
      }
    }
  }, [contractorProp]);

  // const { data: leadData } = useQuery({
  //   queryKey: ['lead', leadId],
  //   queryFn: async () => {
  //     if (!leadId) return null;

  //     const { data, error } = await supabase
  //       .from('leads')
  //       .select('*')
  //       .eq('id', leadId)
  //       .single();

  //     if (error) {
  //       console.error('Error fetching lead:', error);
  //       return null;
  //     }

  //     return data;
  //   },
  //   enabled: !!leadId,
  // });

  // Initialize editable groups when component mounts or when groups change
  useEffect(() => {
    if (groups && groups.length > 0) {
      setEditableGroups(JSON.parse(JSON.stringify(groups)));
      setEditableTotalCost(totalCost);
    }
  }, [groups, totalCost]);

  // Effect for updating parent component on editable groups change
  useEffect(() => {
    if (isEditable && onEstimateChange && editableGroups.length > 0) {
      const estimate = {
        groups: editableGroups,
        totalCost: editableTotalCost
      };
      onEstimateChange(estimate);
    }
  }, [editableGroups, editableTotalCost, isEditable, onEstimateChange]);

  // Get contractor ID from lead if not available
  useEffect(() => {    
    if (!contractorId && leadId) {
      getContractorId();
    }
  }, [contractorId, leadId]);

  const getContractorId = async () => {
    try {
      const { data: leadData, error } = await supabase
        .from('leads')
        .select('contractor_id')
        .eq('id', leadId)
        .single();
      
      if (error) {
        console.error('Error fetching contractor ID:', error);
        return;
      }
      
      if (leadData?.contractor_id) {
        setContractorId(leadData.contractor_id);
      }
    } catch (error) {
      console.error('Error fetching contractor ID:', error);
    }
  };

  // Fetch contractor data when contractor is undefined but we have contractorId
  const { data: fetchedContractor } = useQuery({
    queryKey: ['contractor-data', contractorId],
    queryFn: async () => {
      if (!contractorId) throw new Error("No contractor ID");
      
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          id,
          business_name,
          business_logo_url,
          contact_email,
          contact_phone,
          branding_colors,
          tier,
          cash_credits,
          stripe_customer_id
        `)
        .eq("id", contractorId)
        .single();

      if (error) throw error;
      return data as ContractorDisplay;
    },
    enabled: !!contractorId && !contractor,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update contractor state when fetched data is available
  useEffect(() => {
    if (fetchedContractor && !contractor) {
      setContractor(fetchedContractor);
    }
  }, [fetchedContractor, contractor]);


  const {data: contractorSettings} = useQuery({
    queryKey: ['contractor-settings'],
    queryFn: async () => {
      const {data, error} = await supabase.from("contractor_settings").select("*").eq("id", contractorId)
      if (error) {
        return null
      }
      return data;
    }
  })

  let {
    data: leadData,
    refetch: refetchLeadData
  } = useQuery({
    queryKey: ['estimate-status', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('leads')
        .select('*, id, estimate_data, status, contractor_signature, contractor_signature_date,' + 
                ' client_signature, client_signature_date, signature_enabled')
        .eq('id', leadId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching lead:', error);
        return null;
      }

      return data;
    },
    refetchInterval: !isEstimateReady ? 3000 : false,
    enabled: !!leadId,
    staleTime: 0,
  });


  // Update signature state when fetching lead data
  // ── place directly AFTER the `useQuery` that defines leadData ──────────
useEffect(() => {
  if (leadData?.signature_enabled !== undefined) {
    setLeadSigEnabled(leadData.signature_enabled);
  }
}, [leadData?.signature_enabled]);

useEffect(() => {
  setLeadSigEnabled(signatureEnabled);
}, [signatureEnabled]);

  useEffect(() => {    
    if (leadData?.contractor_signature) {
      setSignature(leadData.contractor_signature);
    }
    
    if (leadData?.client_signature) {
      setClientSignature(leadData.client_signature);
    }
  }, [leadData]);

  // Robust handleContractorSign function for EstimateDisplay.tsx
  const handleContractorSignature = async (leadId: string) => {
    if (!leadId || !contractorId) {
      console.log('Missing required IDs for signature:', { leadId, contractorId });
      return;
    }
    
    try {
      toast({
        title: "Success",
        description: "Contractor signature recorded successfully",
      });
    } catch (error) {
      console.error('Error recording contractor signature:', error);
      toast({
        title: "Error",
        description: "Failed to record signature. Please try again.",
        variant: "destructive",
      });
    }
  };

  const { data: settings } = useQuery({
    queryKey: ["contractor-settings", contractorId],
    queryFn: async () => {
      if (!contractorId) throw new Error("No contractor ID");
      
      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", contractorId)
        .single();

      if (error) throw error;
      return data as ContractorSettings;
    },
    enabled: !!contractorId
  });

  // Update the effect to handle the signatures correctly with null checks
  useEffect(() => {
    console.log("LEAD DATA, ESTIMATE CHANGE");
    
    if (leadData) {
      // Get contractor signature if any
      if (leadData.contractor_signature) {
        setSignature(leadData.contractor_signature);
      }
      
      // Get client signature if any
      if (leadData.client_signature) {
        setClientSignature(leadData.client_signature);
      }
      
      const isComplete = !!leadData?.estimate_data && leadData.estimate_data.totalCost > 0;
      setIsEstimateReady(isComplete);

      if (isComplete && onEstimateChange && !isEditable) {
        onEstimateChange(leadData.estimate_data);
      }
    }
  }, [leadData, isEditable]);

  // Safely check for signatures from estimate or lead
    useEffect(() => {
    /*  Whenever either prop changes we simply mirror the latest value.
        If the estimate was just unlocked, the signatures coming from the DB
        will now be null, so we’ll immediately clear the local state and the
        signature image disappears. */
    setClientSignature(
      estimate?.client_signature ?? lead?.client_signature ?? null
    );
    setSignature(
      estimate?.contractor_signature ?? lead?.contractor_signature ?? null
    );
  }, [
    estimate?.client_signature,
    estimate?.contractor_signature,
    lead?.client_signature,
    lead?.contractor_signature,
  ]);

  useEffect(() => {
    const hasValidEstimate = groups?.length > 0 && totalCost > 0;
    setIsEstimateReady(hasValidEstimate);
  }, [groups, totalCost]);

  useEffect(() => {
    const checkContractorAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: contractorData } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (contractorData && contractorData.id === contractorId) {
          setIsContractor(true);
        }
      } catch (error) {
        console.error('Error checking contractor access:', error);
      }
    };
    
    if (contractorId) {
      checkContractorAccess();
    }
  }, [contractorId, contractorParam]);

  const handleGenerateInvoice = async (contractor, totalCost) => {
        try {        
          const { data, error } = await supabase.functions.invoke('generate-invoice', {
            body: {
              customerId: contractor?.stripe_customer_id,
              description: 'New lead service fee',
              items: [
                { amount: Math.round((totalCost*100) * 0.03 + 20 + 200), description: 'Service charges' },
              ],
              metadata: {
                plan: 'standard',
                source: 'website'
              }
            }
          });
          
          if (error) {
            throw new Error(error.message || "Failed to generate invoice");
          }
    
          // const { data: refreshData } = await supabase.functions.invoke('fetch-invoices', {
          //   body: {
          //     customerId: contractor?.stripe_customer_id,
          //     limit: 10,
          //     offset: 0
          //   }
          // });
          
          // if (refreshData?.success) {
          //   setInvoices(refreshData.invoices || []);
          // }
          
        } catch (error) {
          console.error('Error generating invoice:', error);
        }
      };

      const handleUsageInvoice = async (contractor, totalCost) => {
          try {
            const { data, error } = await supabase.functions.invoke('generate-invoice', {
              body: {
                customerId: contractor?.stripe_customer_id,
                description: 'New lead service fee',
                items: [
                  { amount: Math.round((totalCost * 100)), description: 'Service charges' },
                ],
                metadata: {
                  plan: 'standard',
                  source: 'website',
                  userId: contractor.id 
                }
              }
            });
            
            if (error) {
              throw new Error(error.message || "Failed to generate invoice");
              return false;
            }
            
            console.log('Invoice generated successfully:', data);
            return true;
            
          } catch (error) {
            console.error('Error generating invoice:', error);
            throw error;
          }
        };

  const handleClientSignature = async (initials: string) => {
    console.log("Handling client signature:", lead, estimate, projectSummary, leadData);
    
    setClientSignature(initials);
    if (onSignatureComplete) {
      onSignatureComplete(initials);
    }

      if (!leadData?.user_name || !leadData?.user_email || !leadData?.user_phone) {
        console.warn('Missing leadData fields, refetching...');
        const { data: newLeadData, error: refetchError } = await refetchLeadData();

        if (refetchError) {
          console.error('Error refetching lead data:', refetchError);
          return;
        }

        // Optional: update leadData reference if needed
        leadData = newLeadData; // This only works if leadData is mutable in your scope
      }

      const { error: smsSendError } = await supabase.functions.invoke('send-sms', {
        body: {
          type: 'customer_signed',
          phone: leadData.user_phone,
          data: {
            clientFirstName: leadData.user_name || "Customer",
            projectTitle: leadData.estimate_data.category || "Your Project",
            totalEstimate: leadData.estimate_data.totalCost || 0,
            leadPageUrl:  `${window.location.origin}/e/${leadId}`
          }
        }
      });

      if (smsSendError) {
        console.error('Error sending SMS:', smsSendError);
      }

    // Only proceed with billing logic if contractor is available
    if (contractor?.tier === 'pioneer' && estimate) {
      console.log("HERE IS THE ESTIMATE DATA", estimate);

      const totalFee = estimate.totalCost;
      const availableCredits = contractor.cash_credits || 0;
      let remainingFee = totalFee;

      if (availableCredits > 0) {
        const creditsToUse = Math.min(availableCredits, totalFee);
        remainingFee = totalFee - creditsToUse;

        const { error } = await supabase
          .from('contractors')
          .update({ cash_credits: availableCredits - creditsToUse * 0.3 })
          .eq('id', contractor.id);

        if (error) {
          console.error('Failed to update cash credits:', error.message);
          return;
        }
      }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
                
        if (authError) {
          console.error('Error checking authentication:', authError);
        }
        
        if (user && user !== null) {
          console.log('User logged in, skipping invoice generation');

          const { data: currentData, error: fetchError } = await supabase
            .from('contractors')
            .select('usage')
            .eq('id', contractor?.id)
            .single();

          if (fetchError) {
            console.error('Error fetching current usage:', fetchError);
            return;
          }

          const currentUsage = currentData?.usage || 0;
          const additionalUsage = 0.10;
          const newUsage = currentUsage + additionalUsage;

          if (newUsage > 5) {
            const result = handleUsageInvoice(contractor, newUsage);
            if (result) {
              const { data: usageData, error: updateError } = await supabase
              .from('contractors')
              .update({ usage: 0.00 })
              .eq('id', contractor?.id);  
            } else {
              const { data: usageData, error: updateError } = await supabase
              .from('contractors')
              .update({ usage: newUsage })
              .eq('id', contractor?.id);
            }
          } else {
            const { data: usageData, error: updateError } = await supabase
              .from('contractors')
              .update({ usage: newUsage })
              .eq('id', contractor?.id);
            if (updateError) {
              console.error('Error updating usage:', updateError);
            }
          }
        }

      
        console.log('User is logged in, generating invoice for user:', user?.id);

        if (remainingFee > 0 && !user) {
          handleGenerateInvoice(contractor, remainingFee);
        }
      }
    };

  const handleLineItemChange = (
    groupIndex: number,
    subgroupIndex: number,
    itemIndex: number,
    field: string,
    value: any
  ) => {
    if (!editableGroups?.[groupIndex]?.subgroups?.[subgroupIndex]?.items?.[itemIndex]) return;
    
    // Create a deep copy to avoid mutating state directly
    const newGroups = JSON.parse(JSON.stringify(editableGroups));
    const item = newGroups[groupIndex].subgroups[subgroupIndex].items[itemIndex];
    
    // Update the field
    if (field === 'quantity') {
      // Convert to number and ensure it's positive
      const newQuantity = Math.max(1, Number(value));
      item.quantity = newQuantity;
      
      // Recalculate total price
      item.totalPrice = newQuantity * item.unitAmount;
    } else if (field === 'unitAmount') {
      // Convert to number and ensure it's positive
      const newUnitAmount = Math.max(0, Number(value));
      item.unitAmount = newUnitAmount;
      
      // Recalculate total price
      item.totalPrice = item.quantity * newUnitAmount;
    } else {
      // For text fields like title and description
      item[field] = value;
    }
    
    // Recalculate subtotals and total cost
    recalculateEstimateTotals(newGroups);
    
    // Update state
    setEditableGroups(newGroups);
  };
  
  // Add a new line item to a subgroup
  const handleAddLineItem = (groupIndex: number, subgroupIndex: number) => {
    if (!editableGroups?.[groupIndex]?.subgroups?.[subgroupIndex]) return;
    
    const newGroups = JSON.parse(JSON.stringify(editableGroups));
    
    // Create a new line item with default values
    const newItem = {
      title: "New Item",
      description: "",
      quantity: 1,
      unitAmount: 0,
      totalPrice: 0
    };
    
    // Add the new item to the specified subgroup
    newGroups[groupIndex].subgroups[subgroupIndex].items.push(newItem);
    
    // Recalculate subtotals and total cost
    recalculateEstimateTotals(newGroups);
    
    // Update state
    setEditableGroups(newGroups);
  };
  
  // Delete a line item from a subgroup
  const handleDeleteLineItem = (groupIndex: number, subgroupIndex: number, itemIndex: number) => {
    if (!editableGroups?.[groupIndex]?.subgroups?.[subgroupIndex]?.items) return;
    
    const newGroups = JSON.parse(JSON.stringify(editableGroups));
    
    // Remove the item from the subgroup
    newGroups[groupIndex].subgroups[subgroupIndex].items.splice(itemIndex, 1);
    
    // Recalculate subtotals and total cost
    recalculateEstimateTotals(newGroups);
    
    // Update state
    setEditableGroups(newGroups);
  };

  const handleAddGroup = () => {
    const newGroups: ItemGroup[] = JSON.parse(JSON.stringify(editableGroups));

    newGroups.push({
      name: "",
      description: "",
      subgroups: [
        {
          name: "Default",
          items: [
            {
              title: "New Item",
              description: "",
              quantity: 1,
              unitAmount: 0,
              totalPrice: 0,
            },
          ],
          subtotal: 0,
        },
      ],
      subtotal: 0,
    });

    recalculateEstimateTotals(newGroups);
    setEditableGroups(newGroups);
  };

  // Recalculate all subtotals and total cost
  const recalculateEstimateTotals = (groups: ItemGroup[]) => {
    let totalCost = 0;
    
    // Recalculate each group's subtotal
    groups.forEach(group => {
      let groupTotal = 0;
      
      // Recalculate each subgroup's subtotal
      group.subgroups.forEach(subgroup => {
        let subgroupTotal = 0;
        
        // Sum up all line items in the subgroup
        subgroup.items.forEach(item => {
          subgroupTotal += item.totalPrice;
        });
        
        subgroup.subtotal = subgroupTotal;
        groupTotal += subgroupTotal;
      });
      
      group.subtotal = groupTotal;
      totalCost += groupTotal;
    });
    
    // Update the total cost
    setEditableTotalCost(totalCost);
  };

  const templateSettings = settings || {
    estimate_template_style: 'modern',
    estimate_signature_enabled: false,
    estimate_client_message: '',
    estimate_footer_text: '',
    estimate_hide_subtotals: false,
    estimate_compact_view: true
  };
//const perLeadSignatureEnabled = leadData?.signature_enabled ?? true;
 // const signaturesOn = templateSettings.estimate_signature_enabled && perLeadSignatureEnabled;
 //const signaturesOn = leadSigEnabled;
 //const signaturesOn = templateSettings.estimate_signature_enabled;
  const leadOverride = lead?.signature_enabled;
 const signaturesOn = leadOverride === true ? true : leadOverride === false ? false : templateSettings.estimate_signature_enabled;
 // true if the contractor has globally enabled signatures
const globalSignatureEnabled = templateSettings.estimate_signature_enabled;
// true/false the user can switch per-lead (enterprise only)
const perLeadEnabled       = leadSigEnabled;

  const styles = getTemplateStyles(templateSettings.estimate_template_style);


  const handleDeleteGroup = (groupIndex: number) => {
    const newGroups = JSON.parse(JSON.stringify(editableGroups)) as ItemGroup[];
    newGroups.splice(groupIndex, 1);
    recalculateEstimateTotals(newGroups);
    setEditableGroups(newGroups);
  };

  const renderEditableEstimateTable = () => (
    <div className="space-y-6">
      {editableGroups.map((group, gi) => (
        <div key={gi} className={styles.section}>
          {/* Section name */}
          <Input
            value={group.name}
            placeholder="Section name…"
            onChange={e => {
              const g = JSON.parse(JSON.stringify(editableGroups)) as ItemGroup[];
              g[gi].name = e.target.value;
              setEditableGroups(g);
            }}
            className="sm:w-1/3 w-full mb-2 bg-transparent border-0 focus:ring-0 focus:border-0"
          />

          {/* Remove Section, placed just under the section name */}
          <div className="justify-end mb-3 md:flex hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteGroup(gi)}
              className="text-destructive hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Remove Section
            </Button>
          </div>
          { gi === 0 &&
            <div className="md:hidden block">
              <div className="flex items-end justify-end">
                <div className="inline-flex -space-x-px rounded-lg shadow-sm shadow-black/5 rtl:space-x-reverse w-full gap-2">                
                  <Button
                    variant="outline"
                    className="shadow-none  flex-1"
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
                    className=" shadow-none flex-1"
                    onClick={handleSaveEstimate}
                    disabled={isSaving || (!effectiveContractorId || (isLoadingUser && !urlContractorId))}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          }

          {group.subgroups.map((sg, sgi) => (
            <div key={sgi} className="space-y-3 border p-3 rounded-md">
              {/* Sub-section header */}
              <div className="flex justify-between items-center mb-3">
                <Input
                  value={sg.name}
                  placeholder="Sub-section name…"
                  onChange={e => {
                    const g = JSON.parse(JSON.stringify(editableGroups)) as ItemGroup[];
                    g[gi].subgroups[sgi].name = e.target.value;
                    setEditableGroups(g);
                  }}
                  className="h-8 sm:w-32 bg-transparent border-0 focus:ring-0 focus:border-0"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddLineItem(gi, sgi)}
                  className="h-8 px-2 hidden sm:flex"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
                <div className="flex justify-end items-center sm:hidden block rounded-full bg-red-100 ">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(gi)}
                    className="text-xs text-destructive hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove Section
                  </Button>
                </div>
              </div>

              {sg.items.map((item, ii) => (
                <div
                  key={ii}
                  className="grid grid-cols-12 gap-2 items-start border-b pb-4 mb-4"
                >
                  {/* Title */}
                  <div className="col-span-12 sm:col-span-3 space-y-1">
                    <div className="flex sm:hidden flex-row justify-between items-center">
                      <Label htmlFor={`title-${gi}-${sgi}-${ii}`} className="text-xs">
                        Title
                      </Label>
                      <div className="justify-end flex sm:hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLineItem(gi, sgi, ii)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                        >
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                      <Label htmlFor={`title-${gi}-${sgi}-${ii}`} className="text-xs hidden sm:block">
                        Title
                      </Label>
                      <Input
                        id={`title-${gi}-${sgi}-${ii}`}
                        value={item.title}
                        onChange={e =>
                          handleLineItemChange(gi, sgi, ii, "title", e.target.value)
                        }
                        className="h-8"
                      />
                  </div>

                  {/* Description */}
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <Label htmlFor={`desc-${gi}-${sgi}-${ii}`} className="text-xs">
                      Description
                    </Label>
                    <Textarea
                      id={`desc-${gi}-${sgi}-${ii}`}
                      rows={2}
                      // value={item.description || ""}
                      onChange={e =>
                        handleLineItemChange(gi, sgi, ii, "description", e.target.value)
                      }
                      className="h-12"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-4 sm:col-span-1 space-y-1">
                    <Label htmlFor={`qty-${gi}-${sgi}-${ii}`} className="text-xs">
                      Qty
                    </Label>
                    <Input
                      id={`qty-${gi}-${sgi}-${ii}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e =>
                        handleLineItemChange(gi, sgi, ii, "quantity", e.target.value)
                      }
                      className="h-8"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-4 sm:col-span-1 space-y-1">
                    <Label htmlFor={`price-${gi}-${sgi}-${ii}`} className="text-xs">
                      Unit Price
                    </Label>
                    <Input
                      id={`price-${gi}-${sgi}-${ii}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitAmount}
                      onChange={e =>
                        handleLineItemChange(gi, sgi, ii, "unitAmount", e.target.value)
                      }
                      className="h-8"
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-4 sm:col-span-1 text-right space-y-1">
                    <Label className="text-xs">Total</Label>
                    <div className="h-8 flex items-center justify-end text-sm font-medium">
                      ${item.totalPrice.toFixed(2)}
                    </div>
                  </div>

                  {/* Delete line item */}
                  <div className="col-span-12 sm:col-span-1 justify-end hidden sm:flex">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLineItem(gi, sgi, ii)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive/90"
                    >
                      <MinusCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="min-w-full flex flex-row">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddLineItem(gi, sgi)}
                  className="h-8 min-w-full px-2 block sm:hidden flex flex-row text-primary items-center"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
              <div className="text-right text-sm">
                Subtotal: ${sg.subtotal.toFixed(2)}
              </div>
            </div>
          ))}

          <div className="text-right font-medium">
            Group Total: ${group.subtotal?.toFixed(2) ?? "0.00"}
          </div>
        </div>
      ))}

      {/* bottom "Add Group" */}
      <div className="hidden justify-end mt-4 sm:flex">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAddGroup}
          className="h-8 px-2"
        >
          <Plus className="h-4 w-4 mr-1" /> Add Group
        </Button>
      </div>

      <div className="text-right text-lg font-bold mt-4">
        Total Estimate: ${editableTotalCost.toFixed(2)}
      </div>
    </div>
  );

  // Filter display groups
  const displayGroups = groups
    .map(g => ({
      ...g,
      // drop any sub-group with zero items
      subgroups: (g.subgroups || []).filter(sg => sg.items?.length),
      // hide section title if blank
      hideTitle: !g.name?.trim(),
    }))
    // then drop any group that now has zero sub-groups
    .filter(g => g.subgroups.length);

  return (
    <>
      {!isEstimateReady && (
        <div className="fixed top-0 left-0 right-0 bg-primary text-white p-2 sm:p-4 text-center z-50 animate-in fade-in-0">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4">
              {/*<EstimateAnimation />*/}
            </div>
            <span className="text-xs sm:text-sm">Generating your estimate...</span>
          </div>
        </div>
      )}

      <Card className={cn(styles.card, isBlurred && "blur-md pointer-events-none", "max-w-full mx-auto overflow-hidden")}>
        <div id="estimate-content" className="p-2 sm:p-4 md:p-6">
          <div className={cn("flex flex-row sm:flex-row justify-between gap-4 sm:gap-2", isMobile ? "mb-4" : "")}>
            <EstimateHeader contractor={contractor} styles={styles} />

            <div className={cn(styles.headerContent, "mt-2 sm:mt-0")}>
              <EstimateActions
                isContractor={isContractor}
                companyName={contractor?.business_name || 'Estimate'}
                onRefreshEstimate={async () => {
                  handleRefreshEstimate(leadId);
                }}
                onShowSettings={() => setShowSettings(true)}
                onShowAIPreferences={() => setShowAIPreferences(true)}
                styles={styles}
                groups={editableGroups || []}
                totalCost={editableTotalCost || 0}
                contractor={contractor}
                projectSummary={projectSummary}
                leadId={leadId}
                isEditable={isEditable}
              />
            </div>
          </div>

          {estimate?.ai_generated_title && (
            <h2 className={cn(styles.title, "mb-3 text-center text-base sm:text-lg md:text-xl")}>
              {estimate.ai_generated_title}
            </h2>
          )}

          {(settings?.estimate_client_message || projectSummary) && (
            <div className={cn(styles.message, "mb-4 sm:mb-6 text-sm sm:text-base")}>
              <p className={styles.text}>
                {settings?.estimate_client_message || projectSummary}
              </p>
            </div>
          )}

          {projectImages && projectImages.length > 0 && (
            <div className="mb-4 sm:mb-6 overflow-x-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                {projectImages.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-square relative rounded-lg overflow-hidden"
                  >
                    <img
                      src={image}
                      alt={`Project image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            {isEditable ? (
              renderEditableEstimateTable()
            ) : (
              <EstimateTable
                groups={displayGroups} 
                isLoading={isLoading}
                styles={styles}
                hideSubtotals={templateSettings.estimate_hide_subtotals || false}
                isMobile={isMobile}
              />
            )}
          </div>
          
          {!isEditable && (
            <EstimateTotals
              totalCost={totalCost}
              isEstimateReady={isEstimateReady}
              templateStyle={templateSettings.estimate_template_style || 'modern'}
              styles={styles}
              taxRate={settings?.tax_rate ?? 0}
            />
          )}
 
 
 {isLeadPage && (
  <div className="mt-8">
    {/* ── Heading + per-lead toggle (only after expand) ── */}
    <div className="flex items-start justify-between mb-4">
     <h2 className={cn(styles.title, "text-base sm:text-lg md:text-xl")}>
      Signatures
    </h2>

   {showSignatureSection && contractor?.tier === "enterprise" && (
   <Button
     size="sm"
     variant="outline"
     onClick={() => setShowSignatureSection(false)}
   >
     Hide signatures
   </Button>
 )}
    </div>
   
    

    {/* ── Collapsed “Require Signature” card ── */}
    {!showSignatureSection ? (
      <button
        onClick={() => setShowSignatureSection(true)}
        className="w-full border-2 border-dashed border-primary/50
                   rounded-lg py-6 text-primary/70 hover:bg-primary/5
                   transition"
      >
        Require Signature
      </button>
    ) : (
      <>
        {/* ── Expanded: show signature boxes only if toggle ON ── */}
      
          <EstimateSignature
            signature={
              clientSignature ||
              estimate?.client_signature ||
              lead?.client_signature ||
              null
            }
            contractorSignature={
              signature ||
              estimate?.contractor_signature ||
              lead?.contractor_signature ||
              null
            }
            isEstimateReady={isEstimateReady}
            onSignatureClick={() => setShowSignatureDialog(true)}
            styles={styles}
            isLeadPage={isLeadPage}
            onContractorSignatureClick={
              isLeadPage && handleContractSign
                ? () => handleContractSign(leadId)
                : undefined
            }
            canContractorSign={isLeadPage && isContractor}
          />
        
      </>
    )}
  </div>
   )}


          {/* Cancel / Archive buttons */}
          {!isEditable && (onCancel || onArchive) && (
            <div className="mt-6 flex justify-end gap-2">
              {onCancel && (
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              {onArchive && (
                <Button variant="outline" size="sm" onClick={onArchive}>
                  Archive
                </Button>
              )}
            </div>
          )}

          {templateSettings?.estimate_footer_text && (
            <div className={cn("mt-6 sm:mt-8 pt-4 sm:pt-6 border-t", styles.text, "text-xs sm:text-sm")}>
              <p className="whitespace-pre-wrap">
                {templateSettings.estimate_footer_text}
              </p>
            </div>
          )}


          {isLeadPage && leadData?.signature_enabled &&  (
            <EstimateSignature
              signature={clientSignature || estimate?.client_signature || (lead ? lead.client_signature : null)}
              contractorSignature={signature || estimate?.contractor_signature || (lead ? lead.contractor_signature : null)}
              isEstimateReady={isEstimateReady}
              onSignatureClick={() => setShowSignatureDialog(true)}
              styles={styles}
              isLeadPage={isLeadPage || false}
              onContractorSignatureClick={
                isLeadPage && handleContractSign ? 
                () => handleContractSign(leadId) : 
                undefined
              }
              canContractorSign={
                isLeadPage && 
                isContractor 
              }
            />
          )}
        </div>
      </Card>

      <SignatureDialog
        isOpen={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSign={handleClientSignature}
        contractorId={contractorId}
        leadId={leadId}
        estimateData={estimate}
        isContractorSignature={false} // Set to false for clients in estimate page
      />

      {settings?.estimate_signature_enabled && (
        <>
          {showSettings && (
            <SettingsDialog
              title="Estimate Settings"
              description="Customize how your estimates appear to clients"
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            >
              <EstimateTemplateSettings contractor={contractor} lead={lead || leadData /* <- per-lead context */} />
            </SettingsDialog>
          )}
          {showAIPreferences && (
            <SettingsDialog
              title="AI Preferences"
              description="Configure AI settings for estimate generation"
              isOpen={showAIPreferences}
              onClose={() => setShowAIPreferences(false)}
            >
              <AIPreferencesSettings key={`ai-preferences-${showAIPreferences}`} />
            </SettingsDialog>
          )}
        </>
      )}
    </>
  );
};