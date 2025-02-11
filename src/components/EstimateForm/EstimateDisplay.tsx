
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SignatureDialog } from "./SignatureDialog";
import { EstimateSkeleton } from "./EstimateSkeleton";
import { EstimateHeader } from "./components/EstimateHeader";
import { EstimateBody } from "./components/EstimateBody";
import { EstimateFooter } from "./components/EstimateFooter";
import { EstimateDisplayProps } from "./types";
import { formatItemTitle, formatCurrency } from "./utils/estimateUtils";
import { getTemplateStyles } from "./styles/templateStyles";

interface ContractorSettings {
  id: string;
  estimate_template_style: string;
  estimate_signature_enabled: boolean;
  estimate_client_message: string;
  estimate_footer_text: string;
  estimate_hide_subtotals: boolean;
  estimate_compact_view: boolean;
}

export const EstimateDisplay: React.FC<EstimateDisplayProps> = ({ 
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
  leadId
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const { contractorId } = useParams();
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEstimateReady, setIsEstimateReady] = useState(false);

  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["contractor-settings", contractorId],
    queryFn: async () => {
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

  useEffect(() => {
    const hasValidEstimate = groups?.length > 0 && totalCost > 0;
    setIsEstimateReady(hasValidEstimate);
  }, [groups, totalCost]);

  useEffect(() => {
    checkContractorAccess();
  }, [contractorId]);

  const checkContractorAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && contractorId === user.id) {
      setIsContractor(true);
    }
  };

  const handleRefreshEstimate = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: estimate?.id || leadId,
          contractorId,
          refreshOnly: true,
          answers: estimate?.answers,
          projectDescription: estimate?.project_description || projectSummary,
          category: estimate?.category
        }
      });

      if (error) throw error;

      toast({
        title: "Estimate refresh started",
        description: "Your estimate will be updated shortly.",
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      if (onEstimateChange) {
        onEstimateChange(data);
      }
    } catch (error) {
      console.error('Error refreshing estimate:', error);
      toast({
        title: "Error",
        description: "Failed to refresh the estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById('estimate-content');
    if (!element) return;

    const actionButtons = document.getElementById('estimate-actions');
    if (actionButtons) {
      actionButtons.style.display = 'none';
    }

    const opt = {
      margin: 10,
      filename: `${contractor?.business_name || 'estimate'}-estimate.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      if (actionButtons) {
        actionButtons.style.display = 'flex';
      }
      toast({
        title: "PDF exported",
        description: "Your estimate has been exported as PDF",
      });
    });
  };

  const handleCopyEstimate = () => {
    const estimateText = generateEstimateText();
    navigator.clipboard.writeText(estimateText).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The estimate has been copied to your clipboard",
      });
    });
  };

  const generateEstimateText = () => {
    const companyInfo = contractor || {
      business_name: "Example Company",
      contact_email: "contact@example.com",
      contact_phone: "(555) 123-4567"
    };

    let text = `
${companyInfo.business_name}
${companyInfo.contact_email}
${companyInfo.contact_phone || ''}

Project Overview:
${projectSummary || ''}

${settings?.estimate_client_message || ''}

Estimate Details:
${groups.map(group => `
${group.name}
${group.subgroups.map(subgroup => `
  ${subgroup.name}
  ${subgroup.items.map(item => `
    - ${formatItemTitle(item.title, item.unit)}
      Quantity: ${item.quantity.toLocaleString()}
      Unit Price: ${formatCurrency(item.unitAmount)}
      Total: ${formatCurrency(item.totalPrice)}
  `).join('')}
  Subtotal: ${formatCurrency(subgroup.subtotal)}
`).join('')}
`).join('')}

Total Cost: ${formatCurrency(totalCost)}`;

    return text;
  };

  return (
    <div>
      {/* Component content */}
    </div>
  );
};
