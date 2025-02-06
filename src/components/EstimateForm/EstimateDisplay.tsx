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
      Quantity: ${item.quantity}
      Unit Price: $${item.unitAmount.toFixed(2)}
      Total: $${item.totalPrice.toFixed(2)}
  `).join('')}
  Subtotal: $${subgroup.subtotal.toFixed(2)}
`).join('')}
`).join('')}

Total Estimate: $${totalCost.toFixed(2)}

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
    const primaryColor = brandingColors?.primary || '#9b87f5';
    const primaryColorLight = `${primaryColor}20`;

    const baseTableStyles = {
      table: "w-full border-collapse",
      tableHeader: "text-xs uppercase tracking-wider py-2 px-3 text-left border-b bg-gray-50",
      tableRow: "border-b border-gray-200 hover:bg-gray-50 transition-colors",
      tableCell: "py-2 px-3 text-sm border-r last:border-r-0",
    };

    switch (style) {
      case 'excel':
        return {
          card: "bg-white p-4 md:p-8 max-w-4xl mx-auto shadow-sm",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 space-y-4 md:space-y-0",
          title: "text-xl md:text-2xl font-medium text-gray-900",
          text: "text-gray-600 text-sm",
          section: "bg-white rounded-none border-0 mb-4",
          table: "w-full border border-gray-300",
          tableHeader: "bg-[#E8EAED] text-left font-medium text-gray-700 py-2 px-3 border-b border-r",
          tableRow: "border-b border-gray-300",
          tableCell: "py-2 px-3 border-r text-sm",
          total: "text-2xl md:text-3xl font-medium text-gray-900",
          button: "bg-[#E8EAED] text-gray-700 hover:bg-gray-200 border-gray-300",
          message: "bg-[#F3F4F6] p-4 rounded-lg text-sm", 
          groupTitle: "text-xl font-medium mb-3 w-full text-gray-900",
          subtotal: "text-right py-2 px-3 font-medium bg-[#F3F4F6] border-t border-r text-sm",
        };

      case 'minimal':
        return {
          card: "bg-white p-4 md:p-8 max-w-4xl mx-auto shadow-sm",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 space-y-4 md:space-y-0",
          title: "text-xl md:text-2xl font-light tracking-tight",
          text: "text-neutral-600 text-sm",
          section: "bg-white rounded-none border-0 mb-4",
          ...baseTableStyles,
          tableHeader: "bg-gray-50 text-left font-medium text-gray-600 py-2 px-3 border-b",
          total: "text-2xl md:text-3xl font-light",
          button: "bg-gray-100 text-gray-700 hover:bg-gray-200",
          message: "bg-gray-50 p-4 rounded-lg text-sm", 
          groupTitle: "text-xl font-medium mb-3 w-full",
          subtotal: "hidden",
        };

      case 'classic':
        return {
          card: "bg-white p-4 md:p-8 max-w-4xl mx-auto shadow-lg",
          header: `flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 border-b-2 border-[${primaryColor}] space-y-4 md:space-y-0`,
          title: `text-xl md:text-2xl font-serif font-bold text-[${primaryColor}]`,
          text: "text-[#4A4A4A] font-serif text-sm",
          section: "bg-white rounded-lg mb-4 shadow-sm",
          ...baseTableStyles,
          tableHeader: `bg-[${primaryColor}] text-white font-serif py-2 px-3 text-left`,
          total: `text-2xl md:text-3xl font-serif font-bold text-[${primaryColor}]`,
          button: `border border-[${primaryColor}] text-[${primaryColor}] hover:bg-[${primaryColorLight}]`,
          message: "bg-gray-50 p-4 rounded-lg border text-sm",
          groupTitle: "text-xl font-serif font-bold mb-3 w-full",
          subtotal: "text-right py-2 text-base font-serif font-medium",
        };

      case 'bold':
        return {
          card: "bg-white p-4 md:p-8 max-w-4xl mx-auto shadow-xl",
          header: `bg-[${primaryColor}] -mx-4 -mt-4 md:-mx-8 md:-mt-8 p-4 md:p-8 mb-8`,
          title: "text-xl md:text-2xl font-black text-white",
          text: "text-white/90 text-sm",
          section: "bg-white p-4 rounded-xl mb-4 shadow-sm",
          ...baseTableStyles,
          tableHeader: "bg-gray-100 text-gray-800 font-bold py-2 px-3 text-left",
          tableRow: "border-b hover:bg-gray-50 transition-colors",
          tableCell: "py-2 px-3 text-sm",
          total: "text-3xl md:text-4xl font-black text-gray-900",
          button: "bg-gray-100 text-gray-800 hover:bg-gray-200",
          message: "bg-gray-50 p-4 rounded-xl text-sm",
          groupTitle: "text-xl font-black mb-3 text-gray-900 w-full",
          subtotal: "text-right py-2 text-base font-bold text-gray-900",
        };

      default: // modern
        return {
          card: "bg-white p-4 md:p-8 max-w-4xl mx-auto shadow-lg",
          header: "flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 border-b space-y-4 md:space-y-0",
          title: `text-xl md:text-2xl font-bold text-[${primaryColor}]`,
          text: "text-gray-600 text-sm",
          section: "bg-white rounded-none mb-0 last:mb-4",
          ...baseTableStyles,
          tableHeader: "bg-gray-800 text-white font-medium py-2 px-3 text-left",
          total: `text-2xl md:text-3xl font-bold text-[${primaryColor}]`,
          button: `bg-gray-100 text-gray-800 hover:bg-gray-200`,
          message: "bg-gray-50 p-4 rounded-lg text-sm",
          groupTitle: `text-xl font-bold mb-3 w-full text-[${primaryColor}]`,
          subtotal: "text-right py-2 text-base font-medium",
        };
    }
  };

  const formatUnit = (unit?: string) => {
    if (!unit) return '';
    const unitMap: Record<string, string> = {
      'square feet': 'SF',
      'linear feet': 'LF',
      'cubic feet': 'CF',
      'each': 'EA',
      'hour': 'HR',
      'day': 'DAY',
      'week': 'WK',
      'month': 'MO',
      'foot': 'FT',
      'yard': 'YD',
      'piece': 'PC',
      'set': 'SET',
      'lot': 'LOT',
    };
    return unitMap[unit.toLowerCase()] || unit;
  };

  const templateStyle = templateSettings?.estimate_template_style || 'modern';
  const styles = getTemplateStyles(templateStyle);
  const hideSubtotals = templateSettings?.estimate_hide_subtotals || false;
  const compactView = templateSettings?.estimate_compact_view || true;

  return (
    <>
      <Card className={cn(
        styles.card,
        isBlurred && "blur-md pointer-events-none"
      )}>
        <div id="estimate-content">
          {/* Company Header */}
          <div className={styles.header}>
            <div className="flex items-center gap-4">
              {contractor?.business_logo_url && (
                <img 
                  src={contractor.business_logo_url} 
                  alt={`${companyInfo.business_name} logo`}
                  className="w-16 h-16 object-contain rounded-lg"
                />
              )}
              <div>
                <h1 className={styles.title}>{companyInfo.business_name}</h1>
                {companyInfo.contact_email && (
                  <p className={styles.text}>{companyInfo.contact_email}</p>
                )}
                {companyInfo.contact_phone && (
                  <p className={styles.text}>{companyInfo.contact_phone}</p>
                )}
              </div>
            </div>
            <div id="estimate-actions" className="flex items-center gap-4">
              {isContractor && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(true)}
                  className="rounded-full"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", styles.button)}
                onClick={handleCopyEstimate}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", styles.button)}
                onClick={handleExportPDF}
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <div className="text-right hidden md:block">
                <p className={styles.text}>Date</p>
                <p className="font-medium text-sm">{new Date().toLocaleDateString()}</p>
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
              
              {/* Line Items Table */}
              <div className="overflow-hidden">
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.tableHeader}>Item</th>
                      <th className={styles.tableHeader}>Description</th>
                      <th className={cn(styles.tableHeader, "text-right")}>Qty</th>
                      <th className={cn(styles.tableHeader, "text-right")}>Unit Price</th>
                      <th className={cn(styles.tableHeader, "text-right")}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.subgroups?.map(subgroup => 
                      subgroup.items?.map((item, itemIndex) => (
                        <tr key={`${subgroup.name}-${itemIndex}`} className={styles.tableRow}>
                          <td className={styles.tableCell} data-label="Item">
                            {item.title} {item.unit && `(${formatUnit(item.unit)})`}
                          </td>
                          <td className={styles.tableCell} data-label="Description">
                            {item.description}
                          </td>
                          <td className={cn(styles.tableCell, "text-right")} data-label="Qty">
                            {item.quantity}
                          </td>
                          <td className={cn(styles.tableCell, "text-right")} data-label="Unit Price">
                            ${item.unitAmount.toFixed(2)}
                          </td>
                          <td className={cn(styles.tableCell, "text-right font-medium")} data-label="Total">
                            ${item.totalPrice.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Group Subtotal */}
              {!hideSubtotals && (
                <div className={cn(styles.subtotal, "mt-4 pt-3 border-t")}>
                  <span className={styles.text}>Subtotal for {group.name}</span>
                  <span className="font-semibold ml-4">
                    ${group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ))}
          
          {/* Total */}
          <div className={cn("mt-8 pt-6 border-t space-y-4", compactView ? "md:space-y-3" : "md:space-y-6")}>
            <div className="flex justify-between items-center">
              <p className={styles.text}>Subtotal</p>
              <p className={cn(styles.text, "text-lg")}>${totalCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className={styles.text}>Tax (8.5%)</p>
              <p className={cn(styles.text, "text-lg")}>${(totalCost * 0.085).toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <p className={cn(styles.title, "!text-xl")}>Total Estimate</p>
              <p className={styles.total}>${(totalCost * 1.085).toFixed(2)}</p>
            </div>
          </div>
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
