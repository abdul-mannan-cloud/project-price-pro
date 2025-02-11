
import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getTemplateStyles } from '../styles/templateStyles';
import { formatCurrency } from '../utils/estimateUtils';
import { EstimateAnimation } from '../EstimateAnimation';

interface EstimateFooterProps {
  totalCost: number;
  isEstimateReady: boolean;
  templateStyle?: string;
  footerText?: string;
  signatureEnabled?: boolean;
  signature?: string | null;
  onShowSignatureDialog: () => void;
}

export const EstimateFooter: React.FC<EstimateFooterProps> = ({
  totalCost,
  isEstimateReady,
  templateStyle = 'modern',
  footerText,
  signatureEnabled,
  signature,
  onShowSignatureDialog
}) => {
  const styles = getTemplateStyles(templateStyle);

  if (templateStyle === 'excel') {
    return (
      <div className={styles.totalsSection}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr className={styles.totalsRow}>
              <td className={styles.totalsLabel}>Subtotal</td>
              <td className={styles.totalsValue}>
                {isEstimateReady ? formatCurrency(totalCost) : (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded relative overflow-hidden">
                    <EstimateAnimation />
                  </div>
                )}
              </td>
            </tr>
            <tr className={styles.totalsRow}>
              <td className={styles.totalsLabel}>Tax (8.5%)</td>
              <td className={styles.totalsValue}>
                {isEstimateReady ? formatCurrency(totalCost * 0.085) : (
                  <div className="h-6 w-24 bg-gray-200 animate-pulse rounded relative overflow-hidden">
                    <EstimateAnimation />
                  </div>
                )}
              </td>
            </tr>
            <tr className={cn(styles.totalsRow, "font-bold")}>
              <td className={styles.totalsLabel}>Total Estimate</td>
              <td className={cn(styles.totalsValue, "font-bold")}>
                {isEstimateReady ? formatCurrency(totalCost * 1.085) : (
                  <div className="h-6 w-32 bg-gray-200 animate-pulse rounded relative overflow-hidden">
                    <EstimateAnimation />
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className={cn("mt-8 pt-6 border-t space-y-4", styles.totalsSection)}>
        <div className="flex justify-between items-center">
          <p className={styles.text}>Subtotal</p>
          {isEstimateReady ? (
            <p className={cn(styles.text, "text-lg")}>
              {formatCurrency(totalCost)}
            </p>
          ) : (
            <div className="h-6 w-24 bg-gray-200 animate-pulse rounded relative overflow-hidden">
              <EstimateAnimation />
            </div>
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className={styles.text}>Tax (8.5%)</p>
          {isEstimateReady ? (
            <p className={cn(styles.text, "text-lg")}>
              {formatCurrency(totalCost * 0.085)}
            </p>
          ) : (
            <div className="h-6 w-24 bg-gray-200 animate-pulse rounded relative overflow-hidden">
              <EstimateAnimation />
            </div>
          )}
        </div>
        <div className="flex justify-between items-center pt-4 border-t">
          <p className={cn(styles.title, "!text-xl")}>Total Estimate</p>
          {isEstimateReady ? (
            <p className={styles.total}>
              {formatCurrency(totalCost * 1.085)}
            </p>
          ) : (
            <div className="h-8 w-32 bg-gray-200 animate-pulse rounded relative overflow-hidden">
              <EstimateAnimation />
            </div>
          )}
        </div>
      </div>

      {signatureEnabled && (
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
                  onClick={() => !signature && onShowSignatureDialog()}
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
      )}

      {footerText && (
        <div className={cn("mt-8 pt-6 border-t", styles.text)}>
          <p className="whitespace-pre-wrap text-sm">
            {footerText}
          </p>
        </div>
      )}
    </>
  );
};
