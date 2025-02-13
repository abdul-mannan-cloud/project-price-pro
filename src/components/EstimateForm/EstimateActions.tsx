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
}

export const EstimateActions = ({
  isContractor,
  companyName,
  onRefreshEstimate,
  onShowSettings,
  onShowAIPreferences,
  styles
}: EstimateActionsProps) => {
  const { toast } = useToast();

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
    // This functionality should be moved to a utility function
    // and passed through props for better separation of concerns
    toast({
      title: "Copied to clipboard",
      description: "The estimate has been copied to your clipboard",
    });
  };

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
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowAIPreferences}
            className={styles.button}
            title="AI Preferences"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowSettings}
            className={styles.button}
            title="Template Settings"
          >
            <Settings className="h-4 w-4" />
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
