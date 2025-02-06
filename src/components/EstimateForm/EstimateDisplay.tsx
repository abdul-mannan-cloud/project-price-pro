import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileDown, Settings, Phone, Mail, RefreshCw, BrainCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
import { BrandingColors, EstimateTemplateStyle } from "@/types/settings";
import { toast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SignatureDialog } from "./SignatureDialog";

interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  totalPrice: number;
}

interface SubGroup {
  name: string;
  items: LineItem[];
  subtotal: number;
}

interface ItemGroup {
  name: string;
  description?: string;
  subgroups: SubGroup[];
}

type ContractorDisplay = {
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
  estimate?: any; // Added to access AI generated title and message
}

interface ContractorSettings {
  id: string;
  estimate_template_style: string;
  estimate_signature_enabled: boolean;
  estimate_client_message: string;
  estimate_footer_text: string;
  estimate_hide_subtotals: boolean;
  estimate_compact_view: boolean;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatUnit = (unit: string): string => {
  return unit.toLowerCase();
};

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
  estimate
}: EstimateDisplayProps) => {
  const [showSettings, setShowAIPreferences] = useState(false);
  const [showAIPreferences, setShowSettings] = useState(false);
  const { contractorId } = useParams();
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["contractor-settings", contractorId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", contractorId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching settings:", error);
        throw error;
      }

      return data || {
        estimate_template_style: 'modern',
        estimate_signature_enabled: false,
        estimate_client_message: '',
        estimate_footer_text: '',
        estimate_hide_subtotals: false,
        estimate_compact_view: true
      };
    },
    enabled: !!contractorId
  });

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
      toast({
        title: "Refreshing estimate...",
        description: "Please wait while we regenerate your estimate.",
      });
      
      // Trigger estimate regeneration
      const response = await fetch(`/api/generate-estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: estimate.id,
          contractorId: contractorId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh estimate');
      }

      const data = await response.json();
      
      if (onEstimateChange) {
        onEstimateChange(data);
      }

      toast({
        title: "Estimate refreshed",
        description: "Your estimate has been successfully regenerated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh the estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  const defaultCompany = {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  const companyInfo = contractor || defaultCompany;
  const templateSettings = settings || {
    estimate_template_style: 'modern',
    estimate_signature_enabled: false,
    estimate_client_message: '',
    estimate_footer_text: '',
    estimate_hide_subtotals: false,
    estimate_compact_view: true
  };

  const formatItemTitle = (title: string, unit?: string) => {
    if (!unit) return title;
    return `${title} (${unit})`;
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
      filename: `${companyInfo.business_name}-estimate.pdf`,
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
    const estimateText = `
${companyInfo.business_name}
${companyInfo.contact_email}
${companyInfo.contact_phone || ''}

Project Overview:
${projectSummary || ''}

${templateSettings.estimate_client_message || ''}

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

Total Estimate: ${formatCurrency(totalCost)}

${templateSettings.estimate_footer_text || ''}
    `.trim();

    navigator.clipboard.writeText(estimateText).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The estimate has been copied to your clipboard",
      });
    });
  };

  const brandingColors = contractor?.branding_colors 
    ? (typeof contractor.branding_colors === 'string' 
        ? JSON.parse(contractor.branding_colors) as BrandingColors 
        : contractor.branding_colors as BrandingColors)
    : null;

  const getTemplateStyles = (style: EstimateTemplateStyle = 'modern'): Record<string, string> => {
    const baseStyles = {
      card: "bg-white p-4 md:p-8 max-w-5xl mx-auto",
      header: "flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 space-y-4 md:space-y-0",
      headerContent: "flex justify-between items-center w-full",
      businessInfo: "flex items-center gap-6",
      companyInfo: "text-gray-900 font-semibold",
      contactInfo: "text-gray-700 font-medium flex flex-col gap-1",
      contactLink: "hover:underline text-primary transition-colors inline-flex items-center gap-2 text-sm",
      title: "text-xl md:text-2xl font-bold",
      text: "text-gray-600 text-sm",
      section: "bg-white rounded-none mb-0 last:mb-4",
      table: "w-full",
      tableHeader: "text-xs uppercase tracking-wider py-2 px-4 text-left border-b text-black",
      tableRow: "border-b hover:bg-gray-50 transition-colors",
      tableCell: "py-3 px-4 text-sm border-r last:border-r-0 break-words text-black",
      total: "text-2xl md:text-3xl font-bold",
      button: "bg-gray-100 hover:bg-gray-200",
      message: "bg-gray-50 p-4 rounded-lg text-sm",
      groupTitle: "text-base font-bold mb-2 w-full",
      subtotal: "text-right py-2 px-4 text-sm font-medium text-black",
      totalsSection: "space-y-4 mt-8 pt-6 border-t",
      totalsRow: "flex justify-between items-center py-2",
      buttonsContainer: "flex items-center gap-2 ml-auto",
      signatureBox: "h-32 rounded-lg transition-colors",
      signatureText: "font-['Dancing_Script'] text-2xl font-bold text-gray-800",
      signatureDate: "text-sm text-gray-500 mt-1",
      totalsTable: "w-full border-collapse",
      totalsLabel: "py-2 px-4 text-sm font-medium text-left border",
      totalsValue: "py-2 px-4 text-sm text-right border"
    };

    switch (style) {
      case 'classic':
        return {
          ...baseStyles,
          card: "bg-[#FFFDF7] p-6 md:p-10 max-w-5xl mx-auto border border-gray-200",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-8 pb-6 space-y-4 md:space-y-0",
          title: "text-xl md:text-2xl font-serif font-bold",
          text: "font-serif text-gray-700 text-sm leading-relaxed",
          table: "w-full bg-[#FFFDF7]",
          tableHeader: "text-sm font-serif tracking-wide py-4 px-6 text-left border-b-2 border-gray-300 text-gray-800",
          tableRow: "border-b border-gray-200 hover:bg-[#FAF7F0]",
          tableCell: "py-4 px-6 text-sm font-serif break-words text-gray-700",
          total: "text-2xl md:text-3xl font-serif font-bold",
          message: "bg-[#FAF7F0] p-6 border border-gray-200 rounded-none text-sm font-serif",
          groupTitle: "text-lg font-serif font-bold mb-4 w-full",
          subtotal: "text-right py-4 px-6 text-sm font-serif font-medium text-gray-700",
          totalsSection: "space-y-4 mt-8 pt-6 border-t-2 border-gray-300",
          signatureBox: "h-32 bg-[#FAF7F0] border border-gray-200 rounded-none",
          signatureText: "font-['Playfair_Display'] text-2xl font-bold text-gray-800"
        };

      case 'minimal':
        return {
          ...baseStyles,
          card: "bg-white p-8 md:p-12 max-w-5xl mx-auto",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-12 space-y-6 md:space-y-0",
          title: "text-xl md:text-2xl font-light tracking-wide",
          text: "text-gray-600 text-sm font-light leading-relaxed",
          table: "w-full border-t border-gray-100",
          tableHeader: "text-xs uppercase tracking-wide py-4 px-4 text-left text-gray-500 font-light",
          tableRow: "border-b border-gray-50",
          tableCell: "py-4 px-4 text-sm break-words text-gray-700 font-light",
          total: "text-2xl md:text-3xl font-light tracking-wide",
          message: "py-6 text-sm font-light leading-relaxed",
          groupTitle: "text-base font-light uppercase tracking-wide mb-6 w-full",
          subtotal: "text-right py-4 px-4 text-sm font-light text-gray-500",
          totalsSection: "space-y-6 mt-12 pt-6 border-t border-gray-100",
          signatureBox: "h-32 border border-gray-100 rounded-none"
        };

      case 'bold':
        return {
          ...baseStyles,
          card: "bg-gray-900 text-white p-6 md:p-10 max-w-5xl mx-auto rounded-xl shadow-2xl",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-8 pb-6 border-b border-gray-700 space-y-4 md:space-y-0",
          title: "text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
          text: "text-gray-300 text-sm font-medium",
          table: "w-full rounded-lg overflow-hidden bg-gray-800",
          tableHeader: "text-sm uppercase tracking-wider py-4 px-6 text-left bg-gray-700 text-white font-bold",
          tableRow: "border-b border-gray-700 hover:bg-gray-750 transition-all duration-200",
          tableCell: "py-4 px-6 text-sm break-words text-gray-300",
          total: "text-3xl md:text-4xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
          message: "bg-gray-800 p-6 rounded-lg text-sm text-gray-300 border border-gray-700",
          groupTitle: "text-lg font-bold mb-4 w-full bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent",
          subtotal: "text-right py-4 px-6 text-sm font-bold text-gray-300 bg-gray-800",
          totalsSection: "space-y-4 mt-8 pt-6 border-t border-gray-700",
          signatureBox: "h-32 bg-gray-800 border border-gray-700 rounded-lg"
        };

      case 'excel':
        return {
          ...baseStyles,
          card: "bg-white p-0 max-w-5xl mx-auto shadow-sm border border-gray-300",
          header: "flex flex-col md:flex-row md:items-start justify-between p-4 md:p-6 bg-[#F8F9FA] border-b space-y-4 md:space-y-0",
          title: "text-xl md:text-2xl font-normal font-['Calibri']",
          text: "text-gray-700 text-sm font-['Calibri']",
          table: "w-full border-collapse",
          tableHeader: "text-xs font-bold bg-[#E9ECEF] py-2 px-3 text-left border border-gray-300 text-black font-['Calibri']",
          tableRow: "odd:bg-white even:bg-gray-50 hover:bg-[#F8F9FA]",
          tableCell: "py-2 px-3 text-sm border border-gray-300 break-words text-black font-['Calibri']",
          total: "text-xl md:text-2xl font-bold font-['Calibri']",
          message: "bg-[#F8F9FA] p-4 border text-sm font-['Calibri']",
          groupTitle: "text-base font-bold mb-3 w-full font-['Calibri']",
          subtotal: "text-right py-2 px-3 text-sm font-bold bg-[#F8F9FA] border border-gray-300 text-black font-['Calibri']",
          totalsSection: "mt-4",
          totalsTable: "w-full border-collapse",
          totalsRow: "border border-gray-300 font-['Calibri']",
          signatureBox: "h-32 bg-[#F8F9FA] border border-gray-300"
        };

      default: // modern
        const primaryColor = contractor?.branding_colors ? 
          ((typeof contractor.branding_colors === 'string' ? 
            JSON.parse(contractor.branding_colors) : 
            contractor.branding_colors) as BrandingColors).primary : 
          '#007AFF';
        
        return {
          ...baseStyles,
          card: "bg-white p-6 md:p-10 max-w-5xl mx-auto shadow-lg rounded-xl",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-8 pb-6 border-b border-gray-100 space-y-4 md:space-y-0",
          title: `text-xl md:text-2xl font-semibold text-[${primaryColor}]`,
          text: "text-gray-600 text-sm leading-relaxed",
          table: "w-full rounded-lg overflow-hidden",
          tableHeader: "text-xs uppercase tracking-wider py-3 px-6 text-left bg-gray-50 text-gray-700 font-semibold",
          tableRow: "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
          tableCell: "py-4 px-6 text-sm break-words text-gray-800",
          total: `text-2xl md:text-3xl font-bold text-[${primaryColor}]`,
          message: "bg-gray-50 p-6 rounded-xl text-sm leading-relaxed",
          groupTitle: `text-lg font-semibold mb-4 w-full text-[${primaryColor}]`,
          subtotal: "text-right py-3 px-6 text-sm font-medium text-gray-700 bg-gray-50",
          totalsSection: "space-y-4 mt-8 pt-6 border-t border-gray-100",
          signatureBox: "h-32 bg-gray-50 rounded-lg transition-colors"
        };
    }
  };

  const handleSignature = (initials: string) => {
    setSignature(initials);
    if (onSignatureComplete) {
      onSignatureComplete(initials);
    }
  };

  return (
    <>
      <Card className={cn(
        getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').card,
        isBlurred && "blur-md pointer-events-none"
      )}>
        <div id="estimate-content">
          <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').header}>
            <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').headerContent}>
              <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').businessInfo}>
                {contractor?.business_logo_url && (
                  <img 
                    src={contractor.business_logo_url} 
                    alt={`${companyInfo.business_name} logo`}
                    className="w-24 h-24 object-contain rounded-lg"
                  />
                )}
                <div>
                  <h1 className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').companyInfo}>
                    {companyInfo.business_name}
                  </h1>
                  <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').contactInfo}>
                    {companyInfo.contact_email && (
                      <a 
                        href={`mailto:${companyInfo.contact_email}`}
                        className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').contactLink}
                      >
                        <Mail className="h-4 w-4" />
                        {companyInfo.contact_email}
                      </a>
                    )}
                    {companyInfo.contact_phone && (
                      <a 
                        href={`tel:${companyInfo.contact_phone}`}
                        className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').contactLink}
                      >
                        <Phone className="h-4 w-4" />
                        {companyInfo.contact_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').buttonsContainer} id="estimate-actions">
                {isContractor && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefreshEstimate}
                      className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').button}
                      title="Refresh estimate"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(true)}
                      className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').button}
                      title="AI Preferences"
                    >
                      <BrainCog className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAIPreferences(true)}
                      className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').button}
                      title="Template Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2", getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').button)}
                  onClick={handleCopyEstimate}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2", getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').button)}
                  onClick={handleExportPDF}
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </div>

          {/* AI Generated Title */}
          {estimate?.ai_generated_title && (
            <h2 className={cn(
              getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').title,
              "mb-4 text-center"
            )}>
              {estimate.ai_generated_title}
            </h2>
          )}

          {/* AI Generated Message */}
          {(estimate?.ai_generated_message || projectSummary) && (
            <div className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').message, "mb-6")}>
              <p className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').text}>
                {estimate?.ai_generated_message || projectSummary}
              </p>
            </div>
          )}

          {/* Project Images */}
          {projectImages && projectImages.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

          {/* Estimate Groups */}
          {groups?.map((group, index) => (
            <div key={index} className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').section}>
              <h3 className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').groupTitle}>{group.name}</h3>
              
              {templateSettings.estimate_template_style === 'classic' ? (
                <div className="space-y-2">
                  {group.subgroups?.map(subgroup => (
                    <div key={subgroup.name} className="space-y-1">
                      {subgroup.items?.map((item, itemIndex) => (
                        <div key={`${subgroup.name}-${itemIndex}`} className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableRow}>
                          <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableCell}>
                            <span className="font-medium">{item.title}</span>
                            {item.unit && ` (${formatUnit(item.unit)})`}
                            {item.description && (
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            )}
                            <div className="text-sm text-gray-600 mt-1">
                              {item.quantity.toLocaleString()} × {formatCurrency(item.unitAmount)} = {formatCurrency(item.totalPrice)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {!settings?.estimate_hide_subtotals && (
                        <div className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').subtotal}>
                          Subtotal for {subgroup.name}: {formatCurrency(subgroup.subtotal)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full">
                  <table className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').table}>
                    <thead>
                      <tr>
                        <th className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableHeader, "w-[45%]")}>Item</th>
                        <th className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableHeader, "w-[35%]")}>Description</th>
                        <th className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableHeader, "w-[7%] text-right")}>Qty</th>
                        <th className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableHeader, "w-[7%] text-right")}>Price</th>
                        <th className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableHeader, "w-[6%] text-right")}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.subgroups?.map(subgroup => 
                        subgroup.items?.map((item, itemIndex) => (
                          <tr key={`${subgroup.name}-${itemIndex}`} className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableRow}>
                            <td className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableCell, "w-[45%] break-words")}>
                              {item.title} {item.unit && `(${formatUnit(item.unit)})`}
                            </td>
                            <td className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableCell, "w-[35%] break-words")}>
                              {item.description}
                            </td>
                            <td className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableCell, "w-[7%] text-right")}>
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableCell, "w-[7%] text-right")}>
                              {formatCurrency(item.unitAmount)}
                            </td>
                            <td className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').tableCell, "w-[6%] text-right font-medium")}>
                              {formatCurrency(item.totalPrice)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Group Subtotal */}
              {!settings?.estimate_hide_subtotals && templateSettings.estimate_template_style !== 'minimal' && (
                <div className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').subtotal, "mt-4 pt-3 border-t")}>
                  <span className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').text}>Subtotal for {group.name}</span>
                  <span className="font-semibold ml-4">
                    {formatCurrency(group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0))}
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {/* Total */}
          {templateSettings.estimate_template_style === 'excel' ? (
            <div className={getTemplateStyles('excel').totalsSection}>
              <table className={getTemplateStyles('excel').totalsTable}>
                <tbody>
                  <tr className={getTemplateStyles('excel').totalsRow}>
                    <td className={getTemplateStyles('excel').totalsLabel}>Subtotal</td>
                    <td className={getTemplateStyles('excel').totalsValue}>{formatCurrency(totalCost)}</td>
                  </tr>
                  <tr className={getTemplateStyles('excel').totalsRow}>
                    <td className={getTemplateStyles('excel').totalsLabel}>Tax (8.5%)</td>
                    <td className={getTemplateStyles('excel').totalsValue}>{formatCurrency(totalCost * 0.085)}</td>
                  </tr>
                  <tr className={getTemplateStyles('excel').totalsRow}>
                    <td className={cn(getTemplateStyles('excel').totalsLabel, "font-bold")}>Total Estimate</td>
                    <td className={cn(getTemplateStyles('excel').totalsValue, "font-bold")}>{formatCurrency(totalCost * 1.085)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className={cn("mt-8 pt-6 border-t space-y-4", templateSettings.estimate_compact_view ? "md:space-y-3" : "md:space-y-6")}>
              <div className="flex justify-between items-center">
                <p className={getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').text}>Subtotal</p>
                <p className={cn(getTemplateStyles(settings?.estimate_template_style as EstimateTemplateStyle || 'modern').text, "text-lg")}>{formatCurrency(totalCost)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className={getTemplateStyles(settings?.estimate_template_style
