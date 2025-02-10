
import { formatCurrency } from "@/utils/formatters";

interface EstimateTotalsProps {
  totalCost: number;
  templateSettings: {
    estimate_template_style: string;
  };
  formatCurrency: (amount: number) => string;
  getTemplateStyles: (style: string) => Record<string, string>;
}

export const EstimateTotals = ({ 
  totalCost, 
  templateSettings,
  formatCurrency,
  getTemplateStyles
}: EstimateTotalsProps) => {
  if (templateSettings.estimate_template_style === 'excel') {
    return (
      <div className={getTemplateStyles('excel').totalsSection}>
        <table className={getTemplateStyles('excel').totalsTable}>
          <tbody>
            <tr className={getTemplateStyles('excel').totalsRow}>
              <td className={getTemplateStyles('excel').totalsLabel}>Subtotal</td>
              <td className={getTemplateStyles('excel').totalsValue}>{formatCurrency(totalCost)}</td>
            </tr>
            <tr className={getTemplateStyles('excel').totalsRow}>
              <td className={getTemplateStyles('excel').totalsLabel}>Tax (8.5%)</td>
              <td className={getTemplateStyles('excel').totalsValue}>{formatCurrency(totalCost * 0.085)}</td>
            </tr>
            <tr className={`${getTemplateStyles('excel').totalsRow} font-bold`}>
              <td className={getTemplateStyles('excel').totalsLabel}>Total Estimate</td>
              <td className={`${getTemplateStyles('excel').totalsValue} font-bold`}>{formatCurrency(totalCost * 1.085)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`mt-8 pt-6 border-t space-y-4 ${templateSettings.estimate_template_style === 'minimal' ? 'md:space-y-3' : 'md:space-y-6'}`}>
      <div className="flex justify-between items-center">
        <p className={getTemplateStyles(templateSettings.estimate_template_style).text}>Subtotal</p>
        <p className={`${getTemplateStyles(templateSettings.estimate_template_style).text} text-lg`}>{formatCurrency(totalCost)}</p>
      </div>
      <div className="flex justify-between items-center">
        <p className={getTemplateStyles(templateSettings.estimate_template_style).text}>Tax (8.5%)</p>
        <p className={`${getTemplateStyles(templateSettings.estimate_template_style).text} text-lg`}>{formatCurrency(totalCost * 0.085)}</p>
      </div>
      <div className="flex justify-between items-center pt-4 border-t">
        <p className={`${getTemplateStyles(templateSettings.estimate_template_style).title} !text-xl`}>Total Estimate</p>
        <p className={getTemplateStyles(templateSettings.estimate_template_style).total}>{formatCurrency(totalCost * 1.085)}</p>
      </div>
    </div>
  );
};
