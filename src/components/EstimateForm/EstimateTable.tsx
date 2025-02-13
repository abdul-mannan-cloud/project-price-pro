
import { cn } from "@/lib/utils";
import { ItemGroup, SubGroup, LineItem } from "./EstimateDisplay";
import { EstimateAnimation } from "./EstimateAnimation";

interface EstimateTableProps {
  groups: ItemGroup[];
  isLoading: boolean;
  styles: Record<string, string>;
  hideSubtotals: boolean;
}

const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const EstimateTable = ({ 
  groups, 
  isLoading, 
  styles,
  hideSubtotals 
}: EstimateTableProps) => {
  // Add debug logging to track data flow
  console.log('EstimateTable received groups:', groups);

  if (!groups || groups.length === 0) {
    console.log('No groups data available');
    return (
      <div className="p-4 text-center text-gray-500">
        No estimate data available
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
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
                {[1, 2, 3].map((itemIndex) => (
                  <tr key={itemIndex} className={styles.tableRow}>
                    <td className={cn(styles.tableCell, "w-[45%]")}>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                    </td>
                    <td className={cn(styles.tableCell, "w-[35%]")}>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2" />
                    </td>
                    <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
                    </td>
                    <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
                    </td>
                    <td className={cn(styles.tableCell, "w-[6%] text-right")}>
                      <div className="h-4 bg-gray-200 animate-pulse rounded w-full" />
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

  return (
    <div className="space-y-6">
      {groups.map((group, index) => {
        console.log(`Rendering group ${index}:`, group); // Debug log for each group
        return (
          <div key={index} className={styles.section}>
            <h3 className={styles.groupTitle}>{group.name}</h3>
            {group.description && (
              <p className="text-sm text-gray-600 mb-4">{group.description}</p>
            )}
            
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
                {group.subgroups?.map((subgroup, subgroupIndex) => {
                  console.log(`Rendering subgroup ${subgroupIndex} of group ${index}:`, subgroup); // Debug log for each subgroup
                  return subgroup.items?.map((item, itemIndex) => {
                    console.log(`Rendering item ${itemIndex} of subgroup ${subgroupIndex}:`, item); // Debug log for each item
                    return (
                      <tr key={`${subgroup.name}-${itemIndex}`} className={styles.tableRow}>
                        <td className={cn(styles.tableCell, "w-[45%]")}>
                          {item.title}
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
                    );
                  });
                })}
                {!hideSubtotals && group.subgroups?.length > 0 && (
                  <tr className="border-t border-gray-200">
                    <td colSpan={4} className={cn(styles.tableCell, "text-right font-medium")}>
                      Subtotal for {group.name}
                    </td>
                    <td className={cn(styles.tableCell, "text-right font-medium")}>
                      {formatCurrency(group.subgroups.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0))}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};
