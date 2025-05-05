import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getTemplateStyles } from "@/lib/template-styles";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SignatureDialog } from "./SignatureDialog";
import { EstimateHeader } from "./EstimateHeader";
import { EstimateActions } from "./EstimateActions";
import { EstimateTotals } from "./EstimateTotals";
import { EstimateSignature } from "./EstimateSignature";
import { EstimateSkeleton } from "./EstimateSkeleton";
import { EstimateAnimation } from "./EstimateAnimation";

// TABLES
import { EstimateTable as EstimateTableReadOnly } from "./EstimateTable";
import { EstimateTable as EstimateTableEditable } from "./EstimateTableEditable";

import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Json } from "@/integrations/supabase/types";

/***********************
 * TYPES               *
 ***********************/
export interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
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
  subtotal?: number; // ensure present for math
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
  /** When `true` cells become editable & Add‑line row appears */
  isEditable?: boolean;
  /** Fires after user edits anything */
  onEstimateChange?: (updated: { groups: ItemGroup[]; totalCost: number }) => void;
  onSignatureComplete?: (initials: string) => void;
  projectImages?: string[];
  estimate?: any;
  /** Show skeleton etc. */
  isLoading?: boolean;
  handleRefreshEstimate: (id: string) => void;
  leadId: string;
  contractorParam?: string;
  handleContractSign: (leadId: string) => void;
}

/***********************
 * COMPONENT           *
 ***********************/
export const EstimateDisplay: React.FC<EstimateDisplayProps> = ({
  groups: incomingGroups = [],
  totalCost: incomingTotal = 0,
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
}) => {
  /*****************
   * LOCAL STATE   *
   *****************/
  const [groups, setGroups] = useState<ItemGroup[]>(() =>
    JSON.parse(JSON.stringify(incomingGroups))
  );
  const [loading, setLoading] = useState(initialLoading);
  const [signature, setSignature] = useState<string | null>(null);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);

  /** Sync when parent replaces props */
  useEffect(() => {
    setGroups(JSON.parse(JSON.stringify(incomingGroups)));
  }, [incomingGroups]);

  /** Derived total */
  const derivedTotal = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.subtotal ?? 0), 0);
  }, [groups]);

  /** Bubble up after every edit */
  useEffect(() => {
    if (onEstimateChange) {
      onEstimateChange({ groups, totalCost: derivedTotal });
    }
  }, [groups, derivedTotal]);

  /*****************
   * SETTINGS FETCH *
   *****************/
  const contractorId = contractorParam;
  const { data: settings } = useQuery({
    queryKey: ["contractor-settings", contractorId],
    queryFn: async () => {
      if (!contractorId) return {} as ContractorSettings;
      const { data } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", contractorId)
        .single();
      return (data || {}) as ContractorSettings;
    },
    enabled: !!contractorId,
  });

  const styles = getTemplateStyles(
    settings?.estimate_template_style ?? "modern"
  );

  /*****************
   * MEDIA Q        *
   *****************/
  const isMobile = useMediaQuery("(max-width: 640px)");

  /*****************
   * SIGNATURE      *
   *****************/
  const handleSignature = (initials: string) => {
    setSignature(initials);
    onSignatureComplete?.(initials);
    handleContractSign(leadId);
  };

  /*****************
   * RENDER         *
   *****************/
  if (loading) return <EstimateSkeleton />;

  const TableComponent = isEditable ? EstimateTableEditable : EstimateTableReadOnly;

  return (
    <Card
      className={cn(
        styles.card,
        isBlurred && "blur-md pointer-events-none",
        "max-w-full mx-auto overflow-hidden"
      )}
    >
      <div id="estimate-content" className="p-2 sm:p-4 md:p-6">
        {/* Header */}
        <EstimateHeader contractor={contractor} styles={styles} />

        {/* Actions */}
        <EstimateActions
          isContractor={false}
          companyName={contractor?.business_name || "Estimate"}
          onRefreshEstimate={() => handleRefreshEstimate(leadId)}
          styles={styles}
          groups={groups}
          totalCost={derivedTotal}
          contractor={contractor}
          projectSummary={projectSummary}
          leadId={leadId}
        />

        {/* Dynamic table */}
        <div className="overflow-x-auto">
          <TableComponent
            groups={groups}
            isLoading={loading}
            styles={styles}
            hideSubtotals={settings?.estimate_hide_subtotals ?? false}
            isMobile={isMobile}
            isEditable={isEditable}
            onGroupsChange={setGroups}
          />
        </div>

        {/* Totals */}
        <EstimateTotals
          totalCost={derivedTotal}
          isEstimateReady={true}
          templateStyle={settings?.estimate_template_style ?? "modern"}
          styles={styles}
          taxRate={settings?.tax_rate ?? 0}
        />

        {/* Optional signature */}
        {settings?.estimate_signature_enabled && (
          <EstimateSignature
            signature={signature}
            isEstimateReady={true}
            onSignatureClick={() => setShowSignatureDialog(true)}
            styles={styles}
          />
        )}
      </div>

      {/* Signature dialog */}
      <SignatureDialog
        isOpen={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSign={handleSignature}
      />
    </Card>
  );
};
