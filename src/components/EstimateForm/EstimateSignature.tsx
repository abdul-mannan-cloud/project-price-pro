
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EstimateSignatureProps {
  signature: string | null;
  isEstimateReady: boolean;
  onSignatureClick: () => void;
  styles: Record<string, string>;
}

export const EstimateSignature = ({
  signature,
  isEstimateReady,
  onSignatureClick,
  styles
}: EstimateSignatureProps) => {
  return (
    <div className={cn("mt-8 pt-6 border-t space-y-6", styles.text)}>
      <h3 className={cn(styles.title, "!text-xl")}>Signatures</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">Client Signature</p>
          {!isEstimateReady ? (
            <div className="h-32 w-full bg-gray-200 animate-pulse rounded relative overflow-hidden" />
          ) : (
            <div 
              className={cn(
                styles.signatureBox,
                !signature ? "bg-yellow-50 hover:bg-yellow-100 cursor-pointer flex items-center justify-center" : "bg-white"
              )}
              onClick={() => !signature && onSignatureClick()}
            >
              {signature ? (
                <div className="p-4">
                  <p className={styles.signatureText}>
                    {signature}
                  </p>
                  <p className={styles.signatureDate}>
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
          )}
          <p className="text-sm">Sign above to approve this estimate</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">Contractor Signature</p>
          {!isEstimateReady ? (
            <div className="h-32 w-full bg-gray-200 animate-pulse rounded relative overflow-hidden" />
          ) : (
            <div className={cn(styles.signatureBox, "bg-gray-50")}></div>
          )}
          <p className="text-sm">Contractor approval</p>
        </div>
      </div>
    </div>
  );
};
