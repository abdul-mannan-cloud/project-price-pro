
import { cn } from "@/lib/utils";
import { EstimateAnimation } from "./EstimateAnimation";

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
  if (templateStyle === 'excel') {
    return (
      <div className={styles.totalsSection}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr className={styles.totalsRow}>
              <td className={styles.totalsLabel}>Subtotal</td>
              <td className={styles.totalsValue}>
                {isEstimateReady ? formatCurrency(totalCost) : (
                  <div className="inline-block h-4 w-24 relative overflow-hidden">
                    <EstimateAnimation />
                  </div>
                )}
              </td>
            </tr>
            <tr className={styles.totalsRow}>
              <td className={styles.totalsLabel}>Tax (8.5%)</td>
              <td className={styles.totalsValue}>
                {isEstimateReady ? formatCurrency(totalCost * 0.085) : (
                  <div className="inline-block h-4 w-24 relative overflow-hidden">
                    <EstimateAnimation />
                  </div>
                )}
              </td>
            </tr>
            <tr className={cn(styles.totalsRow, "font-bold")}>
              <td className={styles.totalsLabel}>Total Estimate</td>
              <td className={cn(styles.totalsValue, "font-bold")}>
                {isEstimateReady ? formatCurrency(totalCost * 1.085) : (
                  <div className="inline-block h-4 w-32 relative overflow-hidden">
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
    <div className={cn("mt-8 pt-6 border-t space-y-4")}>
      <div className="flex justify-between items-center">
        <p className={styles.text}>Subtotal</p>
        {isEstimateReady ? (
          <p className={cn(styles.text, "text-lg")}>
            {formatCurrency(totalCost)}
          </p>
        ) : (
          <div className="h-6 w-24 bg-gray-200 animate-pulse rounded relative overflow-hidden">
            {/*<EstimateAnimation />*/}
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
            {/*<EstimateAnimation />*/}
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
            {/*<EstimateAnimation />*/}
          </div>
        )}
      </div>
    </div>
  );
};
