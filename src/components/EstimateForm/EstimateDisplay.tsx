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
    switch (style) {
      case 'minimal':
        return {
          card: "bg-white p-8 max-w-4xl mx-auto shadow-sm",
          header: "flex items-start justify-between mb-8 pb-6",
          title: "text-2xl font-light tracking-tight",
          text: "text-neutral-600",
          section: "bg-white p-4 rounded-none border-0 mb-6",
          table: "w-full divide-y divide-gray-100",
          tableHeader: "text-xs uppercase tracking-wider text-neutral-500 py-3 text-left",
          tableRow: "hover:bg-gray-50",
          tableCell: "py-3 text-sm text-neutral-600",
          total: "text-3xl font-light",
          button: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
          message: "bg-neutral-50 p-4 rounded-none",
        };

      case 'classic':
        return {
          card: "bg-[#F8F6FF] p-8 max-w-4xl mx-auto shadow-lg border-2 border-[#7E69AB]",
          header: "flex items-start justify-between mb-8 pb-6 border-b-2 border-[#7E69AB]",
          title: "text-2xl font-serif font-bold text-[#6E59A5]",
          text: "text-[#4A4A4A] font-serif",
          section: "bg-white p-6 rounded-lg border border-[#D6BCFA] mb-8 shadow-md",
          table: "w-full border-collapse border border-[#D6BCFA]",
          tableHeader: "bg-[#7E69AB] text-white font-serif py-3 px-4",
          tableRow: "border-b border-[#D6BCFA]",
          tableCell: "py-4 px-4 text-[#4A4A4A]",
          total: "text-3xl font-serif font-bold text-[#6E59A5]",
          button: "bg-[#7E69AB] text-white hover:bg-[#6E59A5]",
          message: "bg-[#F8F6FF] p-6 rounded-lg border border-[#D6BCFA]",
        };

      case 'bold':
        return {
          card: "bg-[#1A1F2C] p-8 max-w-4xl mx-auto shadow-2xl",
          header: "flex items-start justify-between mb-8 pb-6 border-b border-[#8B5CF6]",
          title: "text-3xl font-black bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] bg-clip-text text-transparent",
          text: "text-gray-300",
          section: "bg-[#252B3B] p-6 rounded-xl border border-[#8B5CF6] mb-8",
          table: "w-full",
          tableHeader: "bg-[#8B5CF6] text-white font-bold py-4 px-6 rounded-t-lg",
          tableRow: "border-b border-[#3A4356]",
          tableCell: "py-4 px-6 text-gray-300",
          total: "text-4xl font-black text-[#F97316]",
          button: "bg-gradient-to-r from-[#8B5CF6] to-[#D946EF] text-white hover:from-[#7C4DEF] hover:to-[#C935DE]",
          message: "bg-[#252B3B] p-6 rounded-xl border border-[#8B5CF6]",
        };

      default: // modern
        return {
          card: "bg-white p-8 max-w-4xl mx-auto shadow-lg",
          header: "flex items-start justify-between mb-8 pb-6 border-b border-gray-200",
          title: "text-2xl font-bold text-[#1EAEDB]",
          text: "text-gray-600",
          section: "bg-[#F8FAFC] p-6 rounded-xl shadow-sm mb-6",
          table: "w-full",
          tableHeader: "bg-[#1EAEDB] text-white font-medium py-3 px-4 rounded-t-lg",
          tableRow: "border-b border-gray-100 hover:bg-blue-50/50",
          tableCell: "py-3 px-4",
          total: "text-3xl font-bold text-[#1EAEDB]",
          button: "bg-[#1EAEDB] text-white hover:bg-[#33C3F0]",
          message: "bg-blue-50 p-6 rounded-xl border border-blue-100",
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
            <div className="flex items-center space-x-4">
              {contractor?.business_logo_url && (
                <img 
                  src={contractor.business_logo_url} 
                  alt={`${companyInfo.business_name} logo`}
                  className="w-16 h-16 object-contain"
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
            <div className={cn(styles.message, "mb-8")}>
              <p className={styles.text}>{templateSettings.estimate_client_message}</p>
            </div>
          )}

          {/* Project Summary */}
          {projectSummary && (
            <div className={cn(styles.message, "mb-8")}>
              <h2 className={cn(styles.title, "mb-2 !text-xl")}>Project Overview</h2>
              <p className={styles.text}>{projectSummary}</p>
            </div>
          )}

          {/* Estimate Groups */}
          {groups?.map((group, index) => (
            <div key={index} className={styles.section}>
              <div className="mb-4">
                <h3 className={cn(styles.title, "!text-xl")}>{group.name}</h3>
                {group.description && (
                  <p className={styles.text}>{group.description}</p>
                )}
              </div>

              {/* Subgroups */}
              <div className="space-y-6">
                {group.subgroups?.map((subgroup, subIndex) => (
                  <div key={subIndex} className={styles.section}>
                    <h4 className={cn(styles.title, "!text-lg mb-3")}>{subgroup.name}</h4>
                    
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
                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <p className={cn(styles.text, "font-medium")}>Subtotal for {subgroup.name}</p>
                      <p className="font-semibold">${subgroup.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Group Subtotal */}
              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <p className={cn(styles.text, "font-medium")}>Subtotal for {group.name}</p>
                <p className="font-semibold">
                  ${group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
          
          {/* Total */}
          <div className="mt-8 pt-6 border-t space-y-4">
            <div className="flex justify-between items-center">
              <p className={styles.text}>Subtotal</p>
              <p className={styles.text}>${totalCost.toFixed(2)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className={styles.text}>Tax (8.5%)</p>
              <p className={styles.text}>${(totalCost * 0.085).toFixed(2)}</p>
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
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-sm font-medium">Client Signature</p>
                <div className={cn("h-32 rounded-lg", styles.message)}></div>
                <p className="text-sm">Sign above to approve this estimate</p>
              </div>
              <div className="space-y-2">
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
