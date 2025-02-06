import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
import { BrandingColors } from "@/types/settings";
import { toast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

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
  onEstimateChange
}: EstimateDisplayProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const { contractorId } = useParams();
  const [isContractor, setIsContractor] = useState(false);

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
      card: "bg-white p-4 md:p-8 max-w-5xl mx-auto shadow-lg",
      header: "flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 border-b space-y-4 md:space-y-0",
      headerContent: "flex justify-between items-center w-full",
      businessInfo: "flex items-center gap-6",
      companyInfo: "text-gray-900 font-semibold",
      contactInfo: "text-gray-700 font-medium",
      title: "text-xl md:text-2xl font-bold",
      text: "text-gray-600 text-sm",
      section: "bg-white rounded-none mb-0 last:mb-4",
      table: "w-full table-fixed", // Changed to table-fixed for better column control
      tableHeader: "text-xs uppercase tracking-wider py-2 px-4 text-left border-b text-gray-900",
      tableRow: "border-b border-gray-200 hover:bg-gray-50 transition-colors",
      tableCell: "py-3 px-4 text-sm border-r last:border-r-0 break-words", // Added break-words
      total: "text-2xl md:text-3xl font-bold text-gray-900",
      button: "bg-gray-100 text-gray-800 hover:bg-gray-200",
      message: "bg-gray-50 p-4 rounded-lg text-sm",
      groupTitle: "text-base font-bold mb-2 w-full",
      subtotal: "text-right py-2 px-4 text-sm font-medium text-gray-900",
      totalsSection: "space-y-4 mt-8 pt-6 border-t",
      totalsRow: "flex justify-between items-center py-2 text-gray-900",
      buttonsContainer: "flex items-center gap-2 ml-auto"
    };

    const primaryColor = contractor?.branding_colors 
      ? (typeof contractor.branding_colors === 'string' 
          ? JSON.parse(contractor.branding_colors).primary 
          : (contractor.branding_colors as BrandingColors).primary)
      : '#007AFF';
    const primaryColorLight = `${primaryColor}20`;
    const darkerColor = '#1A1F2C';

    switch (style) {
      case 'bold':
        return {
          ...baseStyles,
          card: "bg-white p-4 md:p-8 max-w-5xl mx-auto shadow-xl",
          header: `bg-[${primaryColor}] -mx-4 -mt-4 md:-mx-8 md:-mt-8 p-4 md:p-8 mb-8`,
          title: `text-xl md:text-2xl font-black text-[${darkerColor}]`,
          text: `text-[${darkerColor}]/90 text-sm`,
          section: "bg-white p-4 rounded-xl mb-4",
          table: "w-full md:min-w-[900px] rounded-xl overflow-hidden border border-gray-200",
          tableHeader: `bg-[${darkerColor}] text-white text-xs font-bold py-2 px-4 text-left`,
          tableRow: `border-b hover:bg-gray-50 transition-colors font-semibold text-[${darkerColor}]`,
          tableCell: `py-3 px-4 text-sm text-[${darkerColor}]`,
          total: `text-3xl md:text-4xl font-black text-[${darkerColor}]`,
          button: `bg-[${darkerColor}]/10 text-[${darkerColor}] hover:bg-[${darkerColor}]/20`,
          message: `bg-gray-50 p-4 rounded-xl text-sm text-[${darkerColor}]`,
          groupTitle: `text-lg font-black mb-2 text-[${darkerColor}] w-full`,
          subtotal: `text-right py-2 px-4 text-sm font-bold text-[${darkerColor}]`,
          companyInfo: `text-[${darkerColor}] font-medium`,
          contactInfo: `text-[${darkerColor}]/80`,
          headerContent: baseStyles.headerContent,
          businessInfo: baseStyles.businessInfo,
          buttonsContainer: baseStyles.buttonsContainer
        };

      default: // modern
        return {
          ...baseStyles,
          title: `text-xl md:text-2xl font-bold text-[${primaryColor}]`,
          groupTitle: `text-base font-bold mb-2 w-full text-[${primaryColor}]`,
          tableHeader: "bg-gray-800 text-xs text-white font-medium py-2 px-4 text-left",
          total: `text-2xl md:text-3xl font-bold text-[${primaryColor}]`,
        };
    }
  };

  const styles = getTemplateStyles(templateSettings.estimate_template_style);

  return (
    <>
      <Card className={cn(
        styles.card,
        isBlurred && "blur-md pointer-events-none"
      )}>
        <div id="estimate-content">
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.businessInfo}>
                {contractor?.business_logo_url && (
                  <img 
                    src={contractor.business_logo_url} 
                    alt={`${companyInfo.business_name} logo`}
                    className="w-24 h-24 object-contain rounded-lg"
                  />
                )}
                <div>
                  <h1 className={styles.companyInfo}>{companyInfo.business_name}</h1>
                  {companyInfo.contact_email && (
                    <p className={styles.contactInfo}>{companyInfo.contact_email}</p>
                  )}
                  {companyInfo.contact_phone && (
                    <p className={styles.contactInfo}>{companyInfo.contact_phone}</p>
                  )}
                </div>
              </div>
              <div className={styles.buttonsContainer} id="estimate-actions">
                {isContractor && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSettings(true)}
                    className={styles.button}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2", styles.button)}
                  onClick={handleCopyEstimate}
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("gap-2", styles.button)}
                  onClick={handleExportPDF}
                >
                  <FileDown className="h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Client Message */}
          {templateSettings?.estimate_client_message && (
            <div className={cn(styles.message, "mb-6")}>
              <p className={styles.text}>{templateSettings.estimate_client_message}</p>
            </div>
          )}

          {/* Project Summary */}
          {projectSummary && (
            <div className={cn(styles.message, "mb-6")}>
              <h2 className={cn(styles.title, "!text-lg mb-2")}>Project Overview</h2>
              <p className={styles.text}>{projectSummary}</p>
            </div>
          )}

          {/* Estimate Groups */}
          {groups?.map((group, index) => (
            <div key={index} className={styles.section}>
              <h3 className={styles.groupTitle}>{group.name}</h3>
              
              {templateSettings.estimate_template_style === 'classic' ? (
                <div className="space-y-2">
                  {group.subgroups?.map(subgroup => (
                    <div key={subgroup.name} className="space-y-1">
                      {subgroup.items?.map((item, itemIndex) => (
                        <div key={`${subgroup.name}-${itemIndex}`} className={styles.tableRow}>
                          <div className={styles.tableCell}>
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
                        <div className={styles.subtotal}>
                          Subtotal for {subgroup.name}: {formatCurrency(subgroup.subtotal)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full">
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={cn(styles.tableHeader, "w-[30%]")}>Item</th>
                        <th className={cn(styles.tableHeader, "w-[40%]")}>Description</th>
                        <th className={cn(styles.tableHeader, "w-[10%] text-right")}>Qty</th>
                        <th className={cn(styles.tableHeader, "w-[10%] text-right")}>Unit Price</th>
                        <th className={cn(styles.tableHeader, "w-[10%] text-right")}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.subgroups?.map(subgroup => 
                        subgroup.items?.map((item, itemIndex) => (
                          <tr key={`${subgroup.name}-${itemIndex}`} className={styles.tableRow}>
                            <td className={cn(styles.tableCell, "w-[30%]")}>
                              {item.title} {item.unit && `(${formatUnit(item.unit)})`}
                            </td>
                            <td className={cn(styles.tableCell, "w-[40%]")}>
                              {item.description}
                            </td>
                            <td className={cn(styles.tableCell, "w-[10%] text-right whitespace-nowrap")}>
                              {item.quantity.toLocaleString()}
                            </td>
                            <td className={cn(styles.tableCell, "w-[10%] text-right whitespace-nowrap")}>
                              {formatCurrency(item.unitAmount)}
                            </td>
                            <td className={cn(styles.tableCell, "w-[10%] text-right whitespace-nowrap font-medium")}>
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
                <div className={cn(styles.subtotal, "mt-4 pt-3 border-t")}>
                  <span className={styles.text}>Subtotal for {group.name}</span>
                  <span className="font-semibold ml-4">
                    {formatCurrency(group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0))}
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {/* Total */}
          {templateSettings.estimate_template_style === 'excel' ? (
            <div className={styles.totalsSection}>
              <div className={styles.totalsRow}>
                <span>Subtotal</span>
                <span className="text-right">{formatCurrency(totalCost)}</span>
              </div>
              <div className={styles.totalsRow}>
                <span>Tax (8.5%)</span>
                <span className="text-right">{formatCurrency(totalCost * 0.085)}</span>
              </div>
              <div className={cn(styles.totalsRow, "font-bold")}>
                <span>Total Estimate</span>
                <span className="text-right">{formatCurrency(totalCost * 1.085)}</span>
              </div>
            </div>
          ) : (
            <div className={cn("mt-8 pt-6 border-t space-y-4", templateSettings.estimate_compact_view ? "md:space-y-3" : "md:space-y-6")}>
              <div className="flex justify-between items-center">
                <p className={styles.text}>Subtotal</p>
                <p className={cn(styles.text, "text-lg")}>{formatCurrency(totalCost)}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className={styles.text}>Tax (8.5%)</p>
                <p className={cn(styles.text, "text-lg")}>{formatCurrency(totalCost * 0.085)}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <p className={cn(styles.title, "!text-xl")}>Total Estimate</p>
                <p className={styles.total}>{formatCurrency(totalCost * 1.085)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Signature Section */}
        {templateSettings?.estimate_signature_enabled && (
          <div className={cn("mt-8 pt-6 border-t space-y-6", styles.text)}>
            <h3 className={cn(styles.title, "!text-xl")}>Signatures</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <p className="text-sm font-medium">Client Signature</p>
                <div className={cn("h-32 rounded-lg", styles.message)}></div>
                <p className="text-sm">Sign above to approve this estimate</p>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium">Contractor Signature</p>
                <div className={cn("h-32 rounded-lg", styles.message)}></div>
                <p className="text-sm">Contractor approval</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Text */}
        {templateSettings?.estimate_footer_text && (
          <div className={cn("mt-8 pt-6 border-t", styles.text)}>
            <p className="whitespace-pre-wrap text-sm">
              {templateSettings.estimate_footer_text}
            </p>
          </div>
        )}
      </Card>

      {isContractor && (
        <SettingsDialog
          title="Estimate Settings"
          description="Customize how your estimates appear to clients"
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        >
          <EstimateTemplateSettings />
        </SettingsDialog>
      )}
    </>
  );
};
