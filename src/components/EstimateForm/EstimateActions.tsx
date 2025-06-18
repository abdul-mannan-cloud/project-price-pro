import { Button } from "@/components/ui/button";
import { Copy, FileDown, RefreshCw, Settings, Menu, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

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
  isEditable?: boolean; // Add this prop to control visibility of buttons
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
  leadId,
  isEditable = false, // Default to not in edit mode
}: EstimateActionsProps) => {
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isExporting, setIsExporting] = useState(false);
  const isEnterprise = contractor?.tier === "enterprise"; // <- ADD THIS LINE

  const handleExportPDF = () => {
    const element = document.getElementById("estimate-content");
    if (!element) return;

    // Set exporting state
    setIsExporting(true);

    // Hide action buttons during export
    const actionButtons = document.getElementById("estimate-actions");
    if (actionButtons) {
      actionButtons.style.display = "none";
    }

    // Create a loading toast
    toast({
      title: "Generating PDF",
      description: "Please wait while your PDF is being created...",
    });

    // Add a slight delay to ensure UI updates before PDF generation
    setTimeout(() => {
      // Improved options for better image rendering and page formatting
      const opt = {
        margin: [15, 15, 20, 15], // [top, right, bottom, left] - extra bottom margin to prevent cutoff
        filename: `${companyName}-estimate.pdf`,
        image: {
          type: "jpeg",
          quality: 1.0, // Maximum image quality
        },
        html2canvas: {
          scale: 2,
          useCORS: true, // Allow cross-origin images
          logging: false,
          letterRendering: true,
          allowTaint: true, // Important for including images
          imageTimeout: 0, // No timeout for images
          backgroundColor: "#ffffff", // Ensure white background
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
          compress: true,
          putOnlyUsedFonts: true,
        },
        pagebreak: { mode: "avoid-all" }, // Try to avoid breaking elements across pages
      };

      // Wait for all images to load before generating PDF
      const images = element.getElementsByTagName("img");
      const imagePromises = Array.from(images).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if image fails to load
        });
      });

      Promise.all(imagePromises)
        .then(() => {
          return html2pdf()
            .set(opt)
            .from(element)
            .toPdf() // Convert to PDF
            .get("pdf") // Get the PDF object
            .then((pdf) => {
              // Add metadata
              pdf.setProperties({
                title: `${companyName} Estimate`,
                subject: "Project Estimate",
                creator: companyName,
                author: companyName,
              });
              return pdf;
            })
            .save(); // Save the PDF
        })
        .then(() => {
          // Restore UI elements
          if (actionButtons) {
            actionButtons.style.display = "flex";
          }

          // Success notification
          toast({
            title: "PDF exported successfully",
            description: "Your estimate has been saved as a PDF file",
          });
          setIsExporting(false);
        })
        .catch((error) => {
          console.error("PDF generation error:", error);

          // Restore UI elements
          if (actionButtons) {
            actionButtons.style.display = "flex";
          }

          // Error notification
          toast({
            title: "Error",
            description: "Failed to export PDF. Please try again.",
            variant: "destructive",
          });
          setIsExporting(false);
        });
    }, 100);
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

    navigator.clipboard
      .writeText(estimateLink)
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

  // Mobile dropdown menu version
  if (isMobile) {
    return (
      <div
        className={cn(styles.buttonsContainer, "flex justify-end")}
        id="estimate-actions"
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isExporting}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {/* Only show these items when not in edit mode and user is contractor */}
            {isContractor && !isEditable && (
              <>
                <DropdownMenuItem onClick={onRefreshEstimate}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Results
                </DropdownMenuItem>
                {isEnterprise && ( // <- ADD WRAPPER
                  <DropdownMenuItem onClick={onShowAIPreferences}>
                    <Bot className="h-4 w-4 mr-2" />
                    AI Preferences
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={onShowSettings}>
                  <Settings className="h-4 w-4 mr-2" />
                  Estimate Settings
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={handleCopyEstimate}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
              <FileDown className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting..." : "Export PDF"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop version with buttons
  return (
    <div className={styles.buttonsContainer} id="estimate-actions">
      {/* Only show these buttons when not in edit mode and user is contractor */}
      {isContractor && !isEditable && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefreshEstimate}
            className={styles.button}
            title="Refresh estimate"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {isEnterprise && ( // <- ADD WRAPPER
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowAIPreferences}
              className={styles.button}
              title="AI Preferences"
            >
              <Bot className="h-4 w-4 mr-1" />
              AI Preferences
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onShowSettings}
            className={styles.button}
            title="Template Settings"
          >
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </>
      )}
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-1", styles.button)}
        onClick={handleCopyEstimate}
      >
        <Copy className="h-4 w-4" />
        Copy
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn("gap-1", styles.button)}
        onClick={handleExportPDF}
        disabled={isExporting}
      >
        <FileDown className="h-4 w-4" />
        {isExporting ? "Exporting..." : "PDF"}
      </Button>
    </div>
  );
};
