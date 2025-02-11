
import React from 'react';
import { cn } from "@/lib/utils";
import { ItemGroup } from '../types';
import { getTemplateStyles } from '../styles/templateStyles';
import { formatCurrency, formatUnit } from '../utils/estimateUtils';
import { EstimateAnimation } from '../EstimateAnimation';

interface EstimateBodyProps {
  groups: ItemGroup[];
  templateStyle?: string;
  isEstimateReady: boolean;
  hideSubtotals?: boolean;
}

export const EstimateBody: React.FC<EstimateBodyProps> = ({
  groups,
  templateStyle = 'modern',
  isEstimateReady,
  hideSubtotals = false
}) => {
  const styles = getTemplateStyles(templateStyle);

  const renderTableContent = () => {
    if (!isEstimateReady) {
      return (
        <div className="space-y-8">
          {[1, 2].map((groupIndex) => (
            <div key={groupIndex} className={styles.section}>
              <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={cn(styles.tableHeader, "w-[45%]")}>Item</th>
                    <th className={cn(styles.tableHeader, "w-[35%]")}>Description</th>
                    <th className={cn(styles.tableHeader, "w-[7%] text-right")}>Qty</th>
                    <th className={cn(styles.tableHeader, "w-[7%] text-right")}>Price</th>
                    <th className={cn(styles.tableHeader, "w-[6%] text-right")}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3].map((rowIndex) => (
                    <tr key={rowIndex} className={styles.tableRow}>
                      <td className={cn(styles.tableCell, "w-[45%]")}>
                        <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className={cn(styles.tableCell, "w-[35%]")}>
                        <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded" />
                      </td>
                      <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                        <div className="h-4 w-12 bg-gray-200 animate-pulse rounded ml-auto" />
                      </td>
                      <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                        <div className="h-4 w-16 bg-gray-200 animate-pulse rounded ml-auto" />
                      </td>
                      <td className={cn(styles.tableCell, "w-[6%] text-right")}>
                        <div className="h-4 w-20 bg-gray-200 animate-pulse rounded ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      );
    }

    return groups?.map((group, index) => (
      <div key={index} className={styles.section}>
        <h3 className={styles.groupTitle}>{group.name}</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={cn(styles.tableHeader, "w-[45%]")}>Item</th>
              <th className={cn(styles.tableHeader, "w-[35%]")}>Description</th>
              <th className={cn(styles.tableHeader, "w-[7%] text-right")}>Qty</th>
              <th className={cn(styles.tableHeader, "w-[7%] text-right")}>Price</th>
              <th className={cn(styles.tableHeader, "w-[6%] text-right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {group.subgroups?.map(subgroup => 
              subgroup.items?.map((item, itemIndex) => (
                <tr key={`${subgroup.name}-${itemIndex}`} className={styles.tableRow}>
                  <td className={cn(styles.tableCell, "w-[45%]")}>
                    {item.title} {item.unit && `(${formatUnit(item.unit)})`}
                  </td>
                  <td className={cn(styles.tableCell, "w-[35%]")}>
                    {item.description}
                  </td>
                  <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                    {item.quantity.toLocaleString()}
                  </td>
                  <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                    {formatCurrency(item.unitAmount)}
                  </td>
                  <td className={cn(styles.tableCell, "w-[6%] text-right font-medium")}>
                    {formatCurrency(item.totalPrice)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!hideSubtotals && (
          <div className={cn(styles.subtotal, "mt-4 pt-3 border-t")}>
            <span className={styles.text}>Subtotal for {group.name}</span>
            <span className="font-semibold ml-4">
              {formatCurrency(group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0))}
            </span>
          </div>
        )}
      </div>
    ));
  };

  return <div className="w-full">{renderTableContent()}</div>;
};
