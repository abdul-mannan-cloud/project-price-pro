
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
  if (!groups || groups.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <EstimateAnimation className="w-16 h-16 mx-auto mb-2" />
        <p>Preparing estimate...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group, index) => (
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
              {group.subgroups?.map((subgroup, subgroupIndex) => (
                <>
                  {subgroup.items?.map((item, itemIndex) => (
                    <tr 
                      key={`${subgroup.name}-${itemIndex}`} 
                      className={cn(
                        styles.tableRow,
                        isLoading && "animate-pulse bg-gray-50"
                      )}
                    >
                      <td className={cn(styles.tableCell, "w-[45%]")}>
                        {isLoading ? (
                          <div className="h-4 bg-gray-200 rounded w-3/4" />
                        ) : (
                          item.title
                        )}
                      </td>
                      <td className={cn(styles.tableCell, "w-[35%]")}>
                        {isLoading ? (
                          <div className="h-4 bg-gray-200 rounded w-1/2" />
                        ) : (
                          item.description
                        )}
                      </td>
                      <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                        {isLoading ? (
                          <div className="h-4 bg-gray-200 rounded w-full" />
                        ) : (
                          item.quantity.toLocaleString()
                        )}
                      </td>
                      <td className={cn(styles.tableCell, "w-[7%] text-right")}>
                        {isLoading ? (
                          <div className="h-4 bg-gray-200 rounded w-full" />
                        ) : (
                          formatCurrency(item.unitAmount)
                        )}
                      </td>
                      <td className={cn(styles.tableCell, "w-[6%] text-right font-medium")}>
                        {isLoading ? (
                          <div className="h-4 bg-gray-200 rounded w-full" />
                        ) : (
                          formatCurrency(item.totalPrice)
                        )}
                      </td>
                    </tr>
                  ))}
                  {!hideSubtotals && subgroup.items?.length > 0 && (
                    <tr className="border-t border-gray-200">
                      <td colSpan={4} className={cn(styles.tableCell, "text-right font-medium")}>
                        Subtotal for {subgroup.name}
                      </td>
                      <td className={cn(styles.tableCell, "text-right font-medium")}>
                        {isLoading ? (
                          <div className="h-4 bg-gray-200 rounded w-full" />
                        ) : (
                          formatCurrency(subgroup.subtotal)
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};
