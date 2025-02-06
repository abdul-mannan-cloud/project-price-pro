import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileDown, Settings, Phone, Mail, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
import { BrandingColors } from "@/types/settings";
import { toast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SignatureDialog } from "./SignatureDialog";
import { BrainCog } from "lucide-react";

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
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const { contractorId } = useParams();
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: settings } = useQuery<ContractorSettings>({
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

  const checkContractorAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && contractorId === user.id) {
      setIsContractor(true);
    }
  };

  useEffect(() => {
    checkContractorAccess();
  }, [contractorId]);

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

  const getTemplateStyles = (style: string = 'modern') => {
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
      case 'minimal':
        return {
          ...baseStyles,
          card: "bg-white p-4 md:p-8 max-w-5xl mx-auto",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-12 space-y-4 md:space-y-0",
          title: "text-xl md:text-2xl font-light tracking-wide",
          text: "text-gray-600 text-sm font-light",
          table: "w-full border-t border-gray-200",
          tableHeader: "text-xs uppercase tracking-wide py-4 px-4 text-left text-gray-600 font-light",
          tableRow: "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
          tableCell: "py-4 px-4 text-sm border border-gray-300 break-words text-gray-800 font-light",
          total: "text-2xl md:text-3xl font-light",
          message: "bg-gray-50/50 p-6 rounded-none text-sm font-light",
          groupTitle: "text-base font-light mb-4 w-full uppercase tracking-wide",
          subtotal: "text-right py-4 px-4 text-sm font-light text-gray-600",
          totalsSection: "space-y-6 mt-12 pt-6 border-t",
          totalsRow: "flex justify-between items-center py-3 text-gray-800 font-light",
          totalsTable: baseStyles.totalsTable,
          totalsLabel: "py-2 px-4 text-sm font-light text-left border border-gray-200",
          totalsValue: "py-2 px-4 text-sm font-light text-right border border-gray-200"
        };

      case 'excel':
        return {
          ...baseStyles,
          card: "bg-white p-0 max-w-5xl mx-auto shadow-sm border border-gray-300",
          header: "flex flex-col md:flex-row md:items-start justify-between p-4 md:p-6 bg-[#F8F9FA] border-b space-y-4 md:space-y-0",
          title: "text-xl md:text-2xl font-normal font-['Calibri']",
          text: "text-gray-700 text-sm font-['Calibri']",
          section: "p-4 md:p-6",
          table: "w-full border-collapse",
          tableHeader: "text-xs font-bold bg-[#E9ECEF] py-2 px-3 text-left border border-gray-300 text-black font-['Calibri']",
          tableRow: "hover:bg-[#F8F9FA] transition-colors",
          tableCell: "py-2 px-3 text-sm border border-gray-300 break-words text-black font-['Calibri']",
          total: "text-xl md:text-2xl font-bold font-['Calibri']",
          message: "bg-[#F8F9FA] p-4 border text-sm font-['Calibri']",
          groupTitle: "text-base font-bold mb-3 w-full font-['Calibri']",
          subtotal: "text-right py-2 px-3 text-sm font-bold bg-[#F8F9FA] border border-gray-300 text-black font-['Calibri']",
          totalsSection: "mt-4",
          totalsTable: "w-full border-collapse",
          totalsRow: "border border-gray-300 font-['Calibri']",
          totalsLabel: "py-2 px-3 text-sm border border-gray-300 bg-[#F8F9FA] font-bold",
          totalsValue: "py-2 px-3 text-sm border border-gray-300 text-right"
        };

      default: // modern
        const primaryColor = contractor?.branding_colors && typeof contractor.branding_colors === 'object' 
          ? (contractor.branding_colors as BrandingColors).primary 
          : '#007AFF';

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
          totalsRow: "flex justify-between items-center py-2 text-gray-800",
          totalsTable: baseStyles.totalsTable,
          totalsLabel: "py-2 px-6 text-sm font-medium text-left border-b",
          totalsValue: "py-2 px-6 text-sm font-medium text-right border-b"
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
        getTemplateStyles(templateSettings.estimate_template_style).card,
        isBlurred && "blur-md pointer-events-none"
      )}>
        <div id="estimate-content">
          <div className={getTemplateStyles(templateSettings.estimate_template_style).header}>
            <div className={getTemplateStyles(templateSettings.estimate_template_style).headerContent}>
              <div className={getTemplateStyles(templateSettings.estimate_template_style).businessInfo}>
                {contractor?.business_logo_url && (
                  <img 
                    src={contractor.business_logo_url} 
                    alt={`${companyInfo.business_name} logo`}
                    className="w-24 h-24 object-contain rounded-lg"
                  />
                )}
                <div>
                  <h1 className={getTemplateStyles(templateSettings.estimate_template_style).companyInfo}>
                    {companyInfo.business_name}
                  </h1>
                  <div className={getTemplateStyles(templateSettings.estimate_template_style).contactInfo}>
                    {companyInfo.contact_email && (
                      <a 
                        href={`mailto:${companyInfo.contact_email}`}
                        className={getTemplateStyles(templateSettings.estimate_template_style).contactLink}
                      >
                        <Mail className="h-4 w-4" />
                        {companyInfo.contact_email}
                      </a>
                    )}
                    {companyInfo.contact_phone && (
                      <a 
                        href={`tel:${companyInfo.contact_phone}`}
                        className={getTemplateStyles(templateSettings.estimate_template_style).contactLink}
                      >
                        <Phone className="h-4 w-4" />
                        {companyInfo.contact_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className={getTemplateStyles(templateSettings.estimate_template_style).buttonsContainer} id="estimate-actions">
                {isContractor && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRefreshEstimate}
                      className={getTemplateStyles(templateSettings.estimate_template_style).button}
                      title="Refresh estimate"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowAIPreferences(true)}
                      className={getTemplateStyles(templateSettings.estimate_template_style).button}
                      title="AI Preferences"
                    >
                      <BrainCog className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowSettings(true)}
                      className={getTemplateStyles(templateSettings.estimate_template_style).button}
                      title="Template Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2", getTemplateStyles(templateSettings.estimate_template_style).button)}
                  onClick={handleCopyEstimate}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2", getTemplateStyles(templateSettings.estimate_template_style).button)}
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
              getTemplateStyles(templateSettings.estimate_template_style).title,
              "mb-4 text-center"
            )}>
              {estimate.ai_generated_title}
            </h2>
          )}

          {/* AI Generated Message */}
          {(estimate?.ai_generated_message || projectSummary) && (
            <div className={cn(getTemplateStyles(templateSettings.estimate_template_style).message, "mb-6")}>
              <p className={getTemplateStyles(templateSettings.estimate_template_style).text}>
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
            <div key={index} className={getTemplateStyles(templateSettings.estimate_template_style).section}>
              <h3 className={getTemplateStyles(templateSettings.estimate_template_style).groupTitle}>{group.name}</h3>
              
              {templateSettings.estimate_template_style === 'classic' ? (
                <div className="space-y-2">
                  {group.subgroups?.map(subgroup => (
                    <div key={subgroup.name} className="space-y-1">
                      {subgroup.items?.map((item, itemIndex) => (
                        <div key={`${subgroup.name}-${itemIndex}`} className={getTemplateStyles(templateSettings.estimate_template_style).tableRow}>
                          <div className={getTemplateStyles(templateSettings.estimate_template_style).tableCell}>
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
                      {!templateSettings.estimate_hide_subtotals && (
                        <div className={getTemplateStyles(templateSettings.estimate_template_style).subtotal}>
                          Subtotal for {subgroup.name}: {formatCurrency(subgroup.subtotal)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full">
                  <table className={getTemplateStyles(templateSettings.estimate_template_style).table}>
                    <thead>
                      <tr>
                        <th className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableHeader, "w-[45%]")}>Item</th>
                        <th className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableHeader, "w-[35%]")}>Description</th>
                        <th className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableHeader, "w-[7%] text-right")}>Qty</th>
                        <th className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableHeader, "w-[7%] text-right")}>Price</th>
                        <th className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableHeader, "w-[6%] text-right")}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.subgroups?.map(subgroup => 
                        subgroup.items?.map((item, itemIndex) => (
                          <tr key={`${subgroup.name}-${itemIndex}`} className={getTemplateStyles(templateSettings.estimate_template_style).tableRow}>
                            <td className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableCell, "w-[45%] break-words")}>
                              {item.title} {item.unit && `(${formatUnit(item.unit)})`}
                            </td>
                            <td className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableCell, "w-[35%] break-words")}>
                              {item.description}
                            </td>
                            <td className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableCell, "w-[7%] text-right")}>
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableCell, "w-[7%] text-right")}>
                              {formatCurrency(item.unitAmount)}
                            </td>
                            <td className={cn(getTemplateStyles(templateSettings.estimate_template_style).tableCell, "w-[6%] text-right font-medium")}>
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
              {!templateSettings.estimate_hide_subtotals && templateSettings.estimate_template_style !== 'minimal' && (
                <div className={cn(getTemplateStyles(templateSettings.estimate_template_style).subtotal, "mt-4 pt-3 border-t")}>
                  <span className={getTemplateStyles(templateSettings.estimate_template_style).text}>Subtotal for {group.name}</span>
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
                <p className={getTemplateStyles(templateSettings.estimate_template_style).text}>Subtotal</p>
                <p className={cn(getTemplateStyles(templateSettings.estimate_template_style).text, "text-lg")}>{formatCurrency(totalCost)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className={getTemplateStyles(templateSettings.estimate_template_style).text}>Tax (8.5%)</p>
                <p className={cn(getTemplateStyles(templateSettings.estimate_template_style).text, "text-lg")}>{formatCurrency(totalCost * 0.085)}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <p className={cn(getTemplateStyles(templateSettings.estimate_template_style).title, "!text-xl")}>Total Estimate</p>
                <p className={getTemplateStyles(templateSettings.estimate_template_style).total}>{formatCurrency(totalCost * 1.085)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Signature Section */}
        {templateSettings?.estimate_signature_enabled && (
          <div className={cn("mt-8 pt-6 border-t space-y-6", getTemplateStyles(templateSettings.estimate_template_style).text)}>
            <h3 className={cn(getTemplateStyles(templateSettings.estimate_template_style).title, "!text-xl")}>Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Client Signature</p>
                <div 
                  className={cn(
                    getTemplateStyles(templateSettings.estimate_template_style).signatureBox,
                    !signature ? "bg-yellow-50 hover:bg-yellow-100 cursor-pointer flex items-center justify-center" : "bg-white"
                  )}
                  onClick={() => !signature && setShowSignatureDialog(true)}
                >
                  {signature ? (
                    <div className="p-4">
                      <p className={getTemplateStyles(templateSettings.estimate_template_style).signatureText}>
                        {signature}
                      </p>
                      <p className={getTemplateStyles(templateSettings.estimate_template_style).signatureDate}>
                        {new Date().toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  ) : (
                    <Button variant="ghost">Sign Here</Button>
                  )}
                </div>
                <p className="text-sm">Sign above to approve this estimate</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Contractor Signature</p>
                <div className={cn(getTemplateStyles(templateSettings.estimate_template_style).signatureBox, "bg-gray-50")}></div>
                <p className="text-sm">Contractor approval</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Text */}
        {templateSettings?.estimate_footer_text && (
          <div className={cn("mt-8 pt-6 border-t", getTemplateStyles(templateSettings.estimate_template_style).text)}>
            <p className="whitespace-pre-wrap text-sm">
              {templateSettings.estimate_footer_text}
            </p>
          </div>
        )}
      </Card>

      <SignatureDialog
        isOpen={showSignatureDialog}
        onClose={() => setShowSignatureDialog(false)}
        onSign={handleSignature}
      />

      {isContractor && (
        <>
          <SettingsDialog
            title="Estimate Settings"
            description="Customize how your estimates appear to clients"
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          >
            <EstimateTemplateSettings />
          </SettingsDialog>
          <SettingsDialog
            title="AI Preferences"
            description="Configure AI settings for estimate generation"
            isOpen={showAIPreferences}
            onClose={() => setShowAIPreferences(false)}
          >
            <AIPreferencesSettings />
          </SettingsDialog>
        </>
      )}
    </>
  );
};
