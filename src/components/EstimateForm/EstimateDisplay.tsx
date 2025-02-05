import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileDown, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
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
    estimate_footer_text: ''
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
        ? JSON.parse(contractor.branding_colors) 
        : contractor.branding_colors)
    : null;

  const getTemplateStyles = (style: string = 'modern') => {
    const primaryColor = contractor?.branding_colors?.primary || '#1EAEDB';
    const primaryColorLight = `${primaryColor}20`; // 20% opacity
    const primaryColorMedium = `${primaryColor}40`; // 40% opacity

    switch (style) {
      case 'minimal':
        return {
          card: "bg-white p-12 max-w-4xl mx-auto shadow-sm",
          header: "flex items-start justify-between mb-12 pb-8",
          title: "text-2xl font-light tracking-tight",
          text: "text-neutral-600",
          section: "bg-white p-8 rounded-none border-0 mb-8 space-y-6",
          table: "w-full divide-y divide-gray-100",
          tableHeader: "text-xs uppercase tracking-wider text-neutral-500 py-4 text-left",
          tableRow: "group hover:bg-gray-50 transition-colors",
          tableCell: "py-4 text-sm text-neutral-600",
          total: "text-4xl font-light",
          button: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
          message: "bg-neutral-50 p-8 rounded-none",
          groupTitle: "text-2xl font-light mb-6 pb-4 border-b",
          subgroupTitle: "text-xl font-light mb-4",
          subtotal: "text-right py-4 text-lg font-light",
        };

      case 'classic':
        return {
          card: `bg-[#F8F6FF] p-12 max-w-4xl mx-auto shadow-lg border-2 border-[${primaryColor}]`,
          header: `flex items-start justify-between mb-12 pb-8 border-b-2 border-[${primaryColor}]`,
          title: `text-3xl font-serif font-bold text-[${primaryColor}]`,
          text: "text-[#4A4A4A] font-serif",
          section: `bg-white p-8 rounded-lg border border-[${primaryColorLight}] mb-8 shadow-md space-y-6`,
          table: `w-full border-collapse border border-[${primaryColorLight}]`,
          tableHeader: `bg-[${primaryColor}] text-white font-serif py-4 px-6`,
          tableRow: `border-b border-[${primaryColorLight}] hover:bg-[${primaryColorLight}] transition-colors`,
          tableCell: "py-4 px-6 text-[#4A4A4A] font-serif",
          total: `text-4xl font-serif font-bold text-[${primaryColor}]`,
          button: `bg-[${primaryColor}] text-white hover:bg-[${primaryColorMedium}]`,
          message: `bg-[#F8F6FF] p-8 rounded-lg border border-[${primaryColorLight}]`,
          groupTitle: "text-2xl font-serif font-bold mb-8 text-center",
          subgroupTitle: "text-xl font-serif font-semibold mb-6 text-center",
          subtotal: "text-right py-6 text-xl font-serif",
        };

      case 'bold':
        return {
          card: "bg-[#1A1F2C] p-12 max-w-4xl mx-auto shadow-2xl",
          header: `flex items-start justify-between mb-12 pb-8 border-b border-[${primaryColor}]`,
          title: `text-3xl font-black bg-gradient-to-r from-[${primaryColor}] to-white bg-clip-text text-transparent`,
          text: "text-gray-300",
          section: `bg-[#252B3B] p-8 rounded-xl border border-[${primaryColor}] mb-8 space-y-6`,
          table: "w-full",
          tableHeader: `bg-[${primaryColor}] text-white font-bold py-6 px-8 rounded-t-lg`,
          tableRow: "border-b border-[#3A4356] hover:bg-[#2A3346] transition-colors",
          tableCell: "py-6 px-8 text-gray-300",
          total: `text-5xl font-black text-[${primaryColor}]`,
          button: `bg-gradient-to-r from-[${primaryColor}] to-[${primaryColorMedium}] text-white hover:opacity-90`,
          message: `bg-[#252B3B] p-8 rounded-xl border border-[${primaryColor}]`,
          groupTitle: "text-3xl font-black mb-8 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent",
          subgroupTitle: "text-2xl font-bold mb-6 text-white",
          subtotal: "text-right py-6 text-2xl font-bold text-white",
        };

      default: // modern
        return {
          card: "bg-white p-12 max-w-4xl mx-auto shadow-lg",
          header: "flex items-start justify-between mb-12 pb-8 border-b border-gray-200",
          title: `text-3xl font-bold text-[${primaryColor}]`,
          text: "text-gray-600",
          section: "bg-[#F8FAFC] p-8 rounded-2xl shadow-sm mb-8 space-y-6",
          table: "w-full",
          tableHeader: `bg-[${primaryColor}] text-white font-medium py-4 px-6 rounded-t-xl`,
          tableRow: `border-b border-gray-100 hover:bg-[${primaryColorLight}] transition-colors`,
          tableCell: "py-4 px-6",
          total: `text-4xl font-bold text-[${primaryColor}]`,
          button: `bg-[${primaryColor}] text-white hover:opacity-90`,
          message: "bg-blue-50 p-8 rounded-2xl border border-blue-100",
          groupTitle: "text-2xl font-bold mb-8",
          subgroupTitle: "text-xl font-semibold mb-6",
          subtotal: "text-right py-6 text-xl font-semibold",
        };
    }
  };

  const templateStyle = templateSettings?.estimate_template_style || 'modern';
  const styles = getTemplateStyles(templateStyle);

  return (
    <>
      <Card className={cn(
        styles.card,
        isBlurred && "blur-md pointer-events-none"
      )}>
        <div id="estimate-content">
          {/* Company Header */}
          <div className={styles.header}>
            <div className="flex items-center space-x-6">
              {contractor?.business_logo_url && (
                <img 
                  src={contractor.business_logo_url} 
                  alt={`${companyInfo.business_name} logo`}
                  className="w-20 h-20 object-contain rounded-lg"
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
            <div id="estimate-actions" className="flex items-center gap-6">
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
                Copy Estimate
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn("gap-2", styles.button)}
                onClick={handleExportPDF}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <div className="text-right">
                <p className={styles.text}>Date</p>
                <p className="font-medium">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Client Message */}
          {templateSettings?.estimate_client_message && (
            <div className={cn(styles.message, "mb-12")}>
              <p className={styles.text}>{templateSettings.estimate_client_message}</p>
            </div>
          )}

          {/* Project Summary */}
          {projectSummary && (
            <div className={cn(styles.message, "mb-12")}>
              <h2 className={cn(styles.title, "!text-2xl mb-4")}>Project Overview</h2>
              <p className={styles.text}>{projectSummary}</p>
            </div>
          )}

          {/* Estimate Groups */}
          {groups?.map((group, index) => (
            <div key={index} className={styles.section}>
              <h3 className={styles.groupTitle}>{group.name}</h3>
              {group.description && (
                <p className={cn(styles.text, "mb-8")}>{group.description}</p>
              )}

              {/* Subgroups */}
              <div className="space-y-8">
                {group.subgroups?.map((subgroup, subIndex) => (
                  <div key={subIndex} className={styles.section}>
                    <h4 className={styles.subgroupTitle}>{subgroup.name}</h4>
                    
                    {/* Line Items Table */}
                    <div className="overflow-x-auto">
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
                          {subgroup.items?.map((item, itemIndex) => (
                            <tr key={itemIndex} className={styles.tableRow}>
                              <td className={styles.tableCell}>{formatItemTitle(item.title, item.unit)}</td>
                              <td className={styles.tableCell}>{item.description}</td>
                              <td className={cn(styles.tableCell, "text-right")}>{item.quantity}</td>
                              <td className={cn(styles.tableCell, "text-right")}>${item.unitAmount.toFixed(2)}</td>
                              <td className={cn(styles.tableCell, "text-right font-medium")}>${item.totalPrice.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Subgroup Subtotal */}
                    <div className={styles.subtotal}>
                      <span className={styles.text}>Subtotal for {subgroup.name}</span>
                      <span className="font-semibold ml-4">${subgroup.subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Group Subtotal */}
              <div className={cn(styles.subtotal, "mt-8 pt-6 border-t")}>
                <span className={styles.text}>Subtotal for {group.name}</span>
                <span className="font-semibold ml-4">
                  ${group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          
          {/* Total */}
          <div className="mt-12 pt-8 border-t space-y-6">
            <div className="flex justify-between items-center">
              <p className={styles.text}>Subtotal</p>
              <p className={cn(styles.text, "text-xl")}>${totalCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className={styles.text}>Tax (8.5%)</p>
              <p className={cn(styles.text, "text-xl")}>${(totalCost * 0.085).toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center pt-6 border-t">
              <p className={cn(styles.title, "!text-2xl")}>Total Estimate</p>
              <p className={styles.total}>${(totalCost * 1.085).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        {templateSettings?.estimate_signature_enabled && (
          <div className={cn("mt-12 pt-8 border-t space-y-8", styles.text)}>
            <h3 className={cn(styles.title, "!text-2xl")}>Signatures</h3>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <p className="text-sm font-medium">Client Signature</p>
                <div className={cn("h-40 rounded-lg", styles.message)}></div>
                <p className="text-sm">Sign above to approve this estimate</p>
              </div>
              <div className="space-y-4">
                <p className="text-sm font-medium">Contractor Signature</p>
                <div className={cn("h-40 rounded-lg", styles.message)}></div>
                <p className="text-sm">Contractor approval</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer Text */}
        {templateSettings?.estimate_footer_text && (
          <div className={cn("mt-12 pt-8 border-t", styles.text)}>
            <p className="whitespace-pre-wrap">
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