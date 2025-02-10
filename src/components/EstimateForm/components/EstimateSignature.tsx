
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EstimateSignatureProps {
  templateSettings: {
    estimate_template_style: string;
    estimate_signature_enabled: boolean;
  };
  signature: string | null;
  setShowSignatureDialog: (show: boolean) => void;
  getTemplateStyles: (style: string) => Record<string, string>;
}

export const EstimateSignature = ({ 
  templateSettings,
  signature,
  setShowSignatureDialog,
  getTemplateStyles
}: EstimateSignatureProps) => {
  if (!templateSettings.estimate_signature_enabled) {
    return null;
  }

  return (
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
  );
};
