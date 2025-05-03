import { Button } from "@/components/ui/button";
import { Copy, FileDown, RefreshCw, Settings, Menu, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2pdf from "html2pdf.js";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useNavigate } from "react-router-dom";
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
  groups: any[];
  totalCost: number;
  leadId: string;
  contractor?: any;
  projectSummary?: string;
}

export const EstimateActions: React.FC<EstimateActionsProps> = ({
  isContractor,
  companyName,
  onRefreshEstimate,
  onShowSettings,
  onShowAIPreferences,
  styles,
  groups,
  totalCost,
  leadId,
  contractor,
  projectSummary,
}) => {
  const { toast } = useToast();
  const isMobile = useMediaQuery("(max-width: 640px)");
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  // Improved handleAddLineItem function that uses session storage for data persistence
  const handleAddLineItem = () => {
    if (!leadId) {
      toast({
        title: "Error",
        description: "Cannot add line item without lead ID",
        variant: "destructive",
      });
      return;
    }

    console.log("Navigating to add line item page with leadId:", leadId);
    
    // Store essential data in session storage to ensure it's available after navigation
    try {
      const dataToStore = {
        leadId: leadId,
        estimateData: {
          groups,
          totalCost
        },
        contractorId: contractor?.id || null,
        projectSummary: projectSummary || ""
      };
      
      console.log("Storing estimate data in session storage:", dataToStore);
      sessionStorage.setItem('pendingAddLine', JSON.stringify(dataToStore));
    } catch (error) {
      console.error("Failed to store estimate data in session storage:", error);
    }
    
    // Navigate with multiple fallbacks in case the primary path fails
    try {
      // Add contractor ID as query parameter if available
      const queryParams = contractor?.id ? `?cid=${contractor.id}` : '';
      navigate(`/add-line/${leadId}${queryParams}`);
    } catch (error) {
      console.error("Navigation error:", error);
      
      try {
        navigate(`/leads/${leadId}/add-line`);
      } catch (error2) {
        console.error("Second navigation attempt failed:", error2);
        
        try {
          navigate(`/dashboard/add-line/${leadId}`);
        } catch (error3) {
          console.error("All navigation attempts failed:", error3);
          toast({
            title: "Navigation Error",
            description: "Could not navigate to add line item page. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleExportPDF = () => {
    const element = document.getElementById("estimate-content");
    if (!element) return;
    setIsExporting(true);
    const actionButtons = document.getElementById("estimate-actions");
    if (actionButtons) actionButtons.style.display = "none";

    toast({
      title: "Generating PDF",
      description: "Please wait…",
    });

    setTimeout(() => {
      const opt = {
        margin: [15, 15, 20, 15],
        filename: `${companyName}-estimate.pdf`,
        image: { type: "jpeg", quality: 1.0 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#fff",
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: "avoid-all" },
      };

      const images = element.getElementsByTagName("img");
      const promises = Array.from(images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((r) => {
              img.onload = r;
              img.onerror = r;
            })
      );

      Promise.all(promises)
        .then(() =>
          html2pdf()
            .set(opt)
            .from(element)
            .toPdf()
            .get("pdf")
            .then((pdf) => {
              pdf.setProperties({
                title: `${companyName} Estimate`,
                author: companyName,
              });
              return pdf;
            })
            .save()
        )
        .then(() => {
          if (actionButtons) actionButtons.style.display = "flex";
          toast({ title: "PDF ready" });
          setIsExporting(false);
        })
        .catch((e) => {
          console.error(e);
          if (actionButtons) actionButtons.style.display = "flex";
          toast({
            title: "Error exporting",
            variant: "destructive",
          });
          setIsExporting(false);
        });
    }, 100);
  };

  const handleCopy = () => {
    navigator.clipboard
      .writeText(`${window.origin}/e/${leadId}`)
      .then(() => toast({ title: "Link copied" }))
      .catch(() =>
        toast({
          title: "Copy failed",
          variant: "destructive",
        })
      );
  };

  // Mobile dropdown menu
  if (isMobile) {
    return (
      <div className={cn(styles.buttonsContainer, "flex justify-end")} id="estimate-actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={isExporting}>
              <Menu className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {isContractor && (
              <>
                <DropdownMenuItem onClick={onRefreshEstimate}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowAIPreferences}>
                  <Settings className="mr-2 h-4 w-4" /> AI Prefs
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowSettings}>
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                {leadId && (
                  <DropdownMenuItem onClick={handleAddLineItem}>
                    <Plus className="mr-2 h-4 w-4" /> Add Line Item
                  </DropdownMenuItem>
                )}
              </>
            )}
            <DropdownMenuItem onClick={handleCopy}>
              <Copy className="mr-2 h-4 w-4" /> Copy Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
              <FileDown className="mr-2 h-4 w-4" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop buttons
  return (
    <div className={styles.buttonsContainer} id="estimate-actions">
      {isContractor && (
        <>
          <Button variant="ghost" size="sm" onClick={onRefreshEstimate}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={onShowAIPreferences}>
            <Settings className="mr-1 h-4 w-4" /> AI Prefs
          </Button>
          <Button variant="ghost" size="sm" onClick={onShowSettings}>
            <Settings className="mr-1 h-4 w-4" /> Settings
          </Button>
        </>
      )}

      <Button variant="ghost" size="sm" onClick={handleCopy}>
        <Copy className="h-4 w-4" /> Copy
      </Button>
      <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={isExporting}>
        <FileDown className="h-4 w-4" /> PDF
      </Button>
      {isContractor && leadId && (
        <Button variant="ghost" size="sm" onClick={handleAddLineItem}>
          <Plus className="h-4 w-4" /> Add Line Item
        </Button>
      )}
    </div>
  );
};