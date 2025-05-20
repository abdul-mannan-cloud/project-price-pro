import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface EstimateSignatureProps {
  signature: string | null;
  isEstimateReady: boolean;
  onSignatureClick: () => void;
  styles: Record<string, string>;
  contractorSignature?: string | null;
  isLeadPage?: boolean;
  onContractorSignatureClick?: () => void; // New prop for contractor signature click
  canContractorSign?: boolean; // New prop to determine if contractor can sign
}

export const EstimateSignature = ({
  signature,
  isEstimateReady,
  onSignatureClick,
  styles,
  contractorSignature = null,
  isLeadPage = false,
  onContractorSignatureClick, // New prop
  canContractorSign = false // New prop with default value
}: EstimateSignatureProps) => {
  const isMobile = useMediaQuery("(max-width: 640px)");

  return (
    <div className={cn(
      "mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 md:pt-6 border-t space-y-3 sm:space-y-6",
      styles.text
    )}>
      <h3 className={cn(
        styles.title,
        isMobile ? "text-base" : "!text-xl"
      )}>Signatures</h3>

      <div className={cn(
        "grid gap-4 sm:gap-6",
        isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
      )}>
        {/* Client Signature - Only clickable in estimate page, and only if not signed yet */}
        <div className="space-y-2 sm:space-y-3">
          <p className={cn(
            "font-medium",
            isMobile ? "text-xs" : "text-sm"
          )}>Client Signature</p>

          {!isEstimateReady ? (
            <div className={cn(
              "bg-gray-200 animate-pulse rounded relative overflow-hidden",
              isMobile ? "h-24" : "h-32"
            )} />
          ) : (
            <div
              className={cn(
                styles.signatureBox,
                // Only make clickable if not signed and not on lead page
                !signature && !isLeadPage ? 
                  "bg-yellow-50 hover:bg-yellow-100 cursor-pointer flex items-center justify-center" :
                  "bg-white",
                isMobile ? "h-24" : "h-32"
              )}
              onClick={() => !signature && !isLeadPage && onSignatureClick()}
            >
              {signature ? (
                <div className="p-2 sm:p-4">
                  <p className={cn(
                    styles.signatureText,
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {signature}
                  </p>
                  <p className={cn(
                    styles.signatureDate,
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ) : !isLeadPage ? ( 
                // Only show "Sign Here" button if not on lead page
                <Button variant="ghost" size={isMobile ? "sm" : "default"}>Sign Here</Button>
              ) : (
                // For lead page with no signature, show an empty state or message
                <div className="p-2 sm:p-4 text-gray-400 flex items-center justify-center h-full">
                  <p className="text-sm">No signature</p>
                </div>
              )}
            </div>
          )}
          <p className={isMobile ? "text-xs" : "text-sm"}>
            {isLeadPage ? "Client approval" : "Sign above to approve this estimate"}
          </p>
        </div>

        {/* Contractor Signature - Now clickable when canContractorSign is true */}
        <div className="space-y-2 sm:space-y-3">
          <p className={cn(
            "font-medium",
            isMobile ? "text-xs" : "text-sm"
          )}>Contractor Signature</p>

          {!isEstimateReady ? (
            <div className={cn(
              "bg-gray-200 animate-pulse rounded relative overflow-hidden",
              isMobile ? "h-24" : "h-32"
            )} />
          ) : (
            <div 
              className={cn(
                styles.signatureBox,
                // Make clickable if contractor can sign and there's no signature yet
                !contractorSignature && canContractorSign && isLeadPage ? 
                  "bg-yellow-50 hover:bg-yellow-100 cursor-pointer flex items-center justify-center" : 
                  "bg-gray-50",
                isMobile ? "h-24" : "h-32"
              )}
              onClick={() => !contractorSignature && canContractorSign && isLeadPage && onContractorSignatureClick && onContractorSignatureClick()}
            >
              {contractorSignature ? (
                <div className="p-2 sm:p-4">
                  <p className={cn(
                    styles.signatureText,
                    isMobile ? "text-sm" : "text-base"
                  )}>
                    {contractorSignature}
                  </p>
                  <p className={cn(
                    styles.signatureDate,
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {new Date().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              ) : canContractorSign && isLeadPage ? (
                // Show sign button if contractor can sign
                <Button variant="ghost" size={isMobile ? "sm" : "default"}>Sign Here</Button>
              ) : (
                // Empty state for no contractor signature
                <div className="p-2 sm:p-4 text-gray-400 flex items-center justify-center h-full">
                  <p className="text-sm">No signature</p>
                </div>
              )}
            </div>
          )}
          <p className={isMobile ? "text-xs" : "text-sm"}>Contractor approval</p>
        </div>
      </div>
    </div>
  );
};