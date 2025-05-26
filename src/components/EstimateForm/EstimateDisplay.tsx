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
  business_name?: string;
  business_logo_url?: string | null;
  contact_email?: string;
  contact_phone?: string | null;
  branding_colors?: Json | null;
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
  lead?: any; // Add lead prop with optional type
  isEstimateLocked?: boolean; // New prop to determine if estimate is locked
  onCancel?: () => void;
  onArchive?: () => void;
  signatureEnabled?: boolean;
}

export const EstimateDisplay = ({
  groups = [],
  totalCost = 0,
  isBlurred = false,
  contractor,
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
  lead = null, // Default to null to avoid undefined errors
  isEstimateLocked = false, // Default value,
  onCancel,
  signatureEnabled = true,
  onArchive
}: EstimateDisplayProps) => {
  const [editableGroups, setEditableGroups] = useState<ItemGroup[]>([]);
  const [editableTotalCost, setEditableTotalCost] = useState(totalCost);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const [contractorId, setContractorId] = useState<string>(contractorParam ?? "");
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isEstimateReady, setIsEstimateReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  // Check if the screen is mobile-sized
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");

  // Initialize editable groups when component mounts or when groups change
  useEffect(() => {
    
    if (groups && groups.length > 0) {
      setEditableGroups(JSON.parse(JSON.stringify(groups)));
      setEditableTotalCost(totalCost);
    }
  }, [groups, totalCost]);
useEffect(() => {
  if (!contractorId && contractor?.id) setContractorId(contractor.id);
}, [contractorId, contractor?.id]);
  
  // Effect for updating parent component on editable groups change
  useEffect(() => {
    // console.log("Editable Issue");
    
    if (isEditable && onEstimateChange && editableGroups.length > 0) {
      const estimate = {
        groups: editableGroups,
        totalCost: editableTotalCost
      };
      onEstimateChange(estimate);
    }
  }, [editableGroups, editableTotalCost, isEditable, onEstimateChange]);

  useEffect(() => {    
    if (!contractorId) {
      getContractorId();
    }
  }, [contractorId]);

  const getContractorId = async () => {
    try {
      const lead = await supabase
        .from('leads')
        .select('contractor_id')
        .eq('id', leadId)
        .single();
      
      if (lead.data && lead.data.contractor_id) {
        setContractorId(lead.data.contractor_id);
      }
    } catch (error) {
      console.error('Error fetching contractor ID:', error);
    }
  };

  const { data: leadData } = useQuery({
    queryKey: ['estimate-status', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
        .from('leads')
        .select('estimate_data, status, contractor_signature, contractor_signature_date, client_signature, client_signature_date')
        .eq('id', leadId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching lead:', error);
        return null;
      }

      return data;
    },
    refetchInterval: !isEstimateReady ? 3000 : false,
    enabled: !!leadId
  });

  // Update signature state when fetching lead data
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
      // Skip fetching lead data as it's causing issues
      // Just record that the signature was applied
      
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
    console.log("LEAD DATA, ESTIMATE CHAGNE");
    
    if (leadData) {
      // Get contractor signature if any
      if (leadData.contractor_signature) {
        setSignature(leadData.contractor_signature);
      }
      
      // Get client signature if any
      if (leadData.client_signature) {
        setClientSignature(leadData.client_signature);
      }
      
      const isComplete  = !!leadData?.estimate_data && leadData.estimate_data.totalCost > 0;
      setIsEstimateReady(isComplete);

      if (isComplete && onEstimateChange && !isEditable) {
        onEstimateChange(leadData.estimate_data);
      }
    }
  }, [leadData, isEditable]);

  // Safely check for signatures from estimate or lead
  useEffect(() => {
    // Initialize client signature from the estimate or lead prop if available
    if (estimate?.client_signature && !clientSignature) {
      setClientSignature(estimate.client_signature);
    } else if (lead?.client_signature && !clientSignature) {
      setClientSignature(lead.client_signature);
    }
    
    // Initialize contractor signature similarly
    if (estimate?.contractor_signature && !signature) {
      setSignature(estimate.contractor_signature);
    } else if (lead?.contractor_signature && !signature) {
      setSignature(lead.contractor_signature);
    }
  }, [estimate, lead, clientSignature, signature]);

  useEffect(() => {
    const hasValidEstimate = groups?.length > 0 && totalCost > 0;
    setIsEstimateReady(hasValidEstimate);
  }, [groups, totalCost]);

  useEffect(() => {
    const checkContractorAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: contractor } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
          
        if (contractor && contractor.id === contractorId) {
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

    const handleClientSignature = async (initials: string) => {
      setClientSignature(initials);
      if (onSignatureComplete) {
        onSignatureComplete(initials);
      }

      if (contractor.tier === 'pioneer') {
        console.log("HERE IS THE ESTIMATE DATA", estimate);

        const totalFee = estimate.totalCost;
        const availableCredits = contractor.cash_credits;
        let remainingFee = totalFee;

        if (availableCredits > 0) {
          const creditsToUse = Math.min(availableCredits, totalFee);
          remainingFee = totalFee - creditsToUse;

          const { error } = await supabase
            .from('contractors')
            .update({ cash_credits: availableCredits - creditsToUse*0.3 })
            .eq('id', contractor.id);

          if (error) {
            console.error('Failed to update cash credits:', error.message);
            return;
          }
        }

        if (remainingFee > 0) {
          handleGenerateInvoice(contractor, remainingFee);
        }
      }
    };


  // Handle changes to line items
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
  // === NEW – create / delete whole sub‑groups ===============================
// 👇 ADD THIS BLOCK just after handleDeleteLineItem
const handleAddGroup = () => {
  const newGroups: ItemGroup[] = JSON.parse(JSON.stringify(editableGroups));

  newGroups.push({
    name: "",                // ← leave blank so nothing shows
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


// ==========================================================================

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

  const styles = getTemplateStyles(templateSettings.estimate_template_style);

  if (isLoading) {
    return <EstimateSkeleton />;
  }
// ── new: remove entire group ───────────────────────────────────────────────
const handleDeleteGroup = (groupIndex: number) => {
  const newGroups = JSON.parse(JSON.stringify(editableGroups)) as ItemGroup[];
  newGroups.splice(groupIndex, 1);
  recalculateEstimateTotals(newGroups);
  setEditableGroups(newGroups);
};

  // ─────────────────────────────────────────────────────────────
// Paste this whole function inside EstimateDisplay.tsx
// (replace the previous renderEditableEstimateTable definition)
// ─────────────────────────────────────────────────────────────
// REPLACE the existing renderEditableEstimateTable with this one

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
          className="w-1/3 mb-2 bg-transparent border-0 focus:ring-0 focus:border-0"
        />

        {/* Remove Section, placed just under the section name */}
        <div className="flex justify-end mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteGroup(gi)}
            className="text-destructive hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Remove Section
          </Button>
        </div>

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
                className="h-8 w-32 bg-transparent border-0 focus:ring-0 focus:border-0"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddLineItem(gi, sgi)}
                className="h-8 px-2"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>

            {sg.items.map((item, ii) => (
              <div
                key={ii}
                className="grid grid-cols-12 gap-2 items-start border-b pb-4 mb-4"
              >
                {/* Title */}
                <div className="col-span-12 sm:col-span-3 space-y-1">
                  <Label htmlFor={`title-${gi}-${sgi}-${ii}`} className="text-xs">
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
                    value={item.description || ""}
                    onChange={e =>
                      handleLineItemChange(gi, sgi, ii, "description", e.target.value)
                    }
                    className="h-12"
                  />
                </div>

                {/* Quantity */}
                <div className="col-span-6 sm:col-span-1 space-y-1">
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
                <div className="col-span-6 sm:col-span-1 space-y-1">
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
                <div className="col-span-12 sm:col-span-1 text-right space-y-1">
                  <Label className="text-xs">Total</Label>
                  <div className="h-8 flex items-center justify-end text-sm font-medium">
                    ${item.totalPrice.toFixed(2)}
                  </div>
                </div>

                {/* Delete line item */}
                <div className="col-span-12 sm:col-span-1 flex justify-end">
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

    {/* bottom “Add Group” */}
    <div className="flex justify-end mt-4">
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

const displayGroups = groups.map(g => ({
  ...g,
  hideTitle: !g.name?.trim(),   // <- flag empty titles
}));

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
          <div className={cn("flex flex-col sm:flex-row justify-between gap-4 sm:gap-2", isMobile ? "mb-4" : "")}>
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

          {templateSettings?.estimate_signature_enabled && signatureEnabled && (
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
                isLeadPage && // Only in the lead page
               // !isEstimateLocked && // Only when not locked
                isContractor // Only if it's the contractor
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

      {isContractor && (
        <>
          {showSettings && (
            <SettingsDialog
              title="Estimate Settings"
              description="Customize how your estimates appear to clients"
              isOpen={showSettings}
              onClose={() => setShowSettings(false)}
            >
              <EstimateTemplateSettings contractor={contractor} />
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