import { Button } from "@/components/ui/button";
import { Copy, FileDown, RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from 'html2pdf.js';
import { cn } from "@/lib/utils";

interface EstimateActionsProps {
  isContractor: boolean;
  companyName: string;
  onRefreshEstimate: () => Promise<void>;
  onShowSettings: () => void;
  onShowAIPreferences: () => void;
  styles: Record<string, string>;
    contractor?: any;
    projectSummary?: string;
    groups: any[];
    totalCost: number;
    leadId: string;
}

export const EstimateActions = ({
  isContractor,
  companyName,
  onRefreshEstimate,
  onShowSettings,
  onShowAIPreferences,
  styles,
    contractor,
    projectSummary,
    groups,
    totalCost,
    leadId
}: EstimateActionsProps) => {
  const { toast } = useToast();

  console.log('lead id',leadId)

  const handleExportPDF = () => {
    const element = document.getElementById('estimate-content');
    if (!element) return;

    const actionButtons = document.getElementById('estimate-actions');
    if (actionButtons) {
      actionButtons.style.display = 'none';
    }

    const opt = {
      margin: 10,
      filename: `${companyName}-estimate.pdf`,
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
    if (!leadId) {
      toast({
        title: "Error",
        description: "Lead ID is missing.",
        variant: "destructive",
      });
      return;
    }

    const estimateLink = `${window.location.origin}/e/${leadId}`;

    navigator.clipboard.writeText(estimateLink)
        .then(() => {
          toast({
            title: "Success",
            description: "Estimate link copied to clipboard",
          });
        })
        .catch((error) => {
          console.error("Error copying estimate link:", error);
          toast({
            title: "Error",
            description: "Failed to copy estimate link.",
            variant: "destructive",
          });
        });
  };

  // const handleCopyEstimate = () => {
  //   try {
  //     // Format the estimate details
  //     const estimateText = `${contractor?.business_name || 'Project'} Estimate\n\n`;
  //
  //     // Add project summary if available
  //     const summaryText = projectSummary
  //         ? `Project Description: ${projectSummary}\n\n`
  //         : '';
  //
  //     console.log('Contractor', contractor);
  //     console.log('Project Summary', projectSummary);
  //     console.log('Groups', groups);
  //
  //     // Format each group with subgroups and items
  //     const groupsText = groups.map(group => {
  //       const subgroupsText = group.subgroups.map(subgroup => {
  //         const itemsText = subgroup.items.map(item =>
  //             `    • ${item.title}: $${item.totalPrice.toFixed(2)} (${item.description})`
  //         ).join('\n');
  //
  //         return `  ${subgroup.name}:\n${itemsText}\n`;
  //       }).join('\n');
  //
  //       return `${group.name}:\n${group.description}\n\n${subgroupsText}`;
  //     }).join('\n');
  //
  //     // Calculate total estimate
  //     const totalEstimate = groups.reduce(
  //         (sum, group) => sum + group.subgroups.reduce((subSum, sg) => subSum + sg.subtotal, 0),
  //         0
  //     );
  //
  //     // Add total cost
  //     const totalText = `\nTotal Estimate: $${totalEstimate.toFixed(2)}`;
  //
  //     // Combine all sections
  //     const fullEstimate = `${estimateText}${summaryText}${groupsText}${totalText}`;
  //
  //     // Copy to clipboard
  //     navigator.clipboard.writeText(fullEstimate);
  //
  //     // Show success toast
  //     toast({
  //       title: "Success",
  //       description: "Estimate copied to clipboard",
  //     });
  //   } catch (error) {
  //     console.error('Error copying estimate:', error);
  //     toast({
  //       title: "Error",
  //       description: "Failed to copy estimate to clipboard",
  //       variant: "destructive",
  //     });
  //   }
  // };

  return (
    <div className={styles.buttonsContainer} id="estimate-actions">
      {isContractor && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefreshEstimate}
            className={styles.button}
            title="Refresh estimate"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Results
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowAIPreferences}
            className={styles.button}
            title="AI Preferences"
          >
            <Settings className="h-4 w-4" />
            AI Preferences
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowSettings}
            className={styles.button}
            title="Template Settings"
          >
            <Settings className="h-4 w-4" />
            Estimate Settings
          </Button>
        </>
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
  );
};
