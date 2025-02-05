import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';

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

export const EstimateDisplay = ({ 
  groups = [], 
  totalCost = 0, 
  isBlurred = false,
  contractor,
  projectSummary,
  isEditable = false,
  onEstimateChange
}: EstimateDisplayProps) => {
  const defaultCompany = {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  const companyInfo = contractor || defaultCompany;
  const settings = contractor?.contractor_settings || {};

  const formatItemTitle = (title: string, unit?: string) => {
    if (!unit) return title;
    return `${title} (${unit})`;
  };

  const handleExportPDF = () => {
    const element = document.getElementById('estimate-content');
    if (!element) return;

    // Hide the action buttons before generating PDF
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
      // Restore the action buttons after PDF generation
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

${settings.estimate_client_message || ''}

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

${settings.estimate_footer_text || ''}
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

  const templateStyle = settings.estimate_template_style || 'modern';

  return (
    <Card className={cn(
      "p-8 max-w-4xl mx-auto transition-all duration-500",
      isBlurred && "blur-md pointer-events-none",
      templateStyle === 'classic' && "border-2"
    )}>
      <div id="estimate-content">
        {/* Company Header */}
        <div className={cn(
          "flex items-start justify-between mb-8 pb-6 border-b",
          templateStyle === 'minimal' && "border-none"
        )}>
          <div className="flex items-center space-x-4">
            {contractor?.business_logo_url && (
              <img 
                src={contractor.business_logo_url} 
                alt={`${companyInfo.business_name} logo`}
                className="w-16 h-16 object-contain"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold">{companyInfo.business_name}</h1>
              {companyInfo.contact_email && (
                <p className="text-sm text-muted-foreground">{companyInfo.contact_email}</p>
              )}
              {companyInfo.contact_phone && (
                <p className="text-sm text-muted-foreground">{companyInfo.contact_phone}</p>
              )}
            </div>
          </div>
          <div id="estimate-actions" className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopyEstimate}
            >
              <Copy className="h-4 w-4" />
              Copy Estimate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportPDF}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Client Message */}
        {settings.estimate_client_message && (
          <div className="mb-8 bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">{settings.estimate_client_message}</p>
          </div>
        )}

        {/* Project Summary */}
        {projectSummary && (
          <div className="mb-8 bg-muted/50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Project Overview</h2>
            <p className="text-sm text-muted-foreground">{projectSummary}</p>
          </div>
        )}

        {/* Estimate Groups */}
        {groups?.map((group, index) => (
          <div key={index} className="bg-gray-50 p-6 rounded-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              )}
            </div>

            {/* Subgroups */}
            <div className="space-y-6">
              {(group.subgroups || [])?.map((subgroup, subIndex) => (
                <div key={subIndex} className="bg-white p-4 rounded-md shadow-sm">
                  <h4 className="font-medium mb-3 text-primary">{subgroup.name}</h4>
                  
                  {/* Line Items Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Item</th>
                          <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Description</th>
                          <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Qty</th>
                          <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Unit Price</th>
                          <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(subgroup.items || [])?.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b border-gray-100">
                            <td className="py-3 px-4 font-medium">{formatItemTitle(item.title, item.unit)}</td>
                            <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
                            <td className="py-3 px-4 text-right">{item.quantity}</td>
                            <td className="py-3 px-4 text-right">${item.unitAmount.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Subgroup Subtotal */}
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <p className="font-medium">Subtotal for {subgroup.name}</p>
                    <p className="font-semibold">${subgroup.subtotal.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Group Subtotal */}
            <div className="mt-6 pt-4 border-t flex justify-between items-center">
              <p className="font-medium">Subtotal for {group.name}</p>
              <p className="font-semibold">
                ${(group.subgroups || []).reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
        
        {/* Total */}
        <div className="mt-8 pt-6 border-t space-y-4">
          <div className="flex justify-between items-center text-muted-foreground">
            <p>Subtotal</p>
            <p>${(totalCost * 0.8).toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <p>Tax (8.5%)</p>
            <p>${(totalCost * 0.085).toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <p>Service Fee (20%)</p>
            <p>${(totalCost * 0.2).toFixed(2)}</p>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-xl font-semibold">Total Estimate</p>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Signature Section */}
      {settings.estimate_signature_enabled && (
        <div className="mt-8 pt-6 border-t space-y-6">
          <h3 className="text-lg font-semibold">Signatures</h3>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-sm font-medium">Client Signature</p>
              <div className="h-32 border rounded-lg bg-muted/20"></div>
              <p className="text-sm text-muted-foreground">Sign above to approve this estimate</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Contractor Signature</p>
              <div className="h-32 border rounded-lg bg-muted/20"></div>
              <p className="text-sm text-muted-foreground">Contractor approval</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Text */}
      {settings.estimate_footer_text && (
        <div className="mt-8 pt-6 border-t">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {settings.estimate_footer_text}
          </p>
        </div>
      )}
    </Card>
  );
};
