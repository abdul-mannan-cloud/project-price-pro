import { cn } from "@/lib/utils";
import { EstimateAnimation } from "./EstimateAnimation";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface EstimateTotalsProps {
  totalCost: number;
  isEstimateReady: boolean;
  templateStyle: string;
  styles: Record<string, string>;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const EstimateTotals = ({
                                 totalCost,
                                 isEstimateReady,
                                 templateStyle,
                                 styles
                               }: EstimateTotalsProps) => {
  const isMobile = useMediaQuery("(max-width: 640px)");

  if (templateStyle === 'excel') {
    return (
        <div className={styles.totalsSection}>
          <table className={cn(styles.totalsTable, "w-full")}>
            <tbody>
            <tr className={styles.totalsRow}>
              <td className={cn(styles.totalsLabel, isMobile ? "text-xs" : "text-sm")}>Subtotal</td>
              <td className={cn(styles.totalsValue, "text-right", isMobile ? "text-sm" : "text-base")}>
                {isEstimateReady ? formatCurrency(totalCost) : (
                    <div className="inline-block h-4 w-16 sm:w-24 relative overflow-hidden">
                      <EstimateAnimation />
                    </div>
                )}
              </td>
            </tr>
            <tr className={styles.totalsRow}>
              <td className={cn(styles.totalsLabel, isMobile ? "text-xs" : "text-sm")}>Tax (8.5%)</td>
              <td className={cn(styles.totalsValue, "text-right", isMobile ? "text-sm" : "text-base")}>
                {isEstimateReady ? formatCurrency(totalCost * 0.085) : (
                    <div className="inline-block h-4 w-16 sm:w-24 relative overflow-hidden">
                      <EstimateAnimation />
                    </div>
                )}
              </td>
            </tr>
            <tr className={cn(styles.totalsRow, "font-bold")}>
              <td className={cn(styles.totalsLabel, isMobile ? "text-sm" : "text-base")}>Total Estimate</td>
              <td className={cn(styles.totalsValue, "font-bold text-right", isMobile ? "text-base" : "text-lg")}>
                {isEstimateReady ? formatCurrency(totalCost * 1.085) : (
                    <div className="inline-block h-4 w-20 sm:w-32 relative overflow-hidden">
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

  // Default style for other templates
  return (
      <div className={cn("mt-4 sm:mt-6 md:mt-8 pt-3 sm:pt-4 md:pt-6 border-t space-y-2 sm:space-y-4")}>
        <div className="flex justify-between items-center">
          <p className={cn(styles.text, isMobile ? "text-xs" : "text-sm")}>Subtotal</p>
          {isEstimateReady ? (
              <p className={cn(styles.text, isMobile ? "text-sm" : "text-lg")}>
                {formatCurrency(totalCost)}
              </p>
          ) : (
              <div className={cn("bg-gray-200 animate-pulse rounded relative overflow-hidden",
                  isMobile ? "h-4 w-16" : "h-6 w-24")} />
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className={cn(styles.text, isMobile ? "text-xs" : "text-sm")}>Tax (8.5%)</p>
          {isEstimateReady ? (
              <p className={cn(styles.text, isMobile ? "text-sm" : "text-lg")}>
                {formatCurrency(totalCost * 0.085)}
              </p>
          ) : (
              <div className={cn("bg-gray-200 animate-pulse rounded relative overflow-hidden",
                  isMobile ? "h-4 w-16" : "h-6 w-24")} />
          )}
        </div>
        <div className="flex justify-between items-center pt-2 sm:pt-4 border-t">
          <p className={cn(styles.title, isMobile ? "text-sm" : "!text-xl")}>Total Estimate</p>
          {isEstimateReady ? (
              <p className={cn(styles.total, isMobile ? "text-base font-bold" : "text-xl font-bold")}>
                {formatCurrency(totalCost * 1.085)}
              </p>
          ) : (
              <div className={cn("bg-gray-200 animate-pulse rounded relative overflow-hidden",
                  isMobile ? "h-5 w-20" : "h-8 w-32")} />
          )}
        </div>
      </div>
  );
};