import { cn } from "@/lib/utils";
import { ItemGroup, SubGroup, LineItem } from "./EstimateDisplay";
import { EstimateAnimation } from "./EstimateAnimation";
import React from "react";

interface EstimateTableProps {
  groups: ItemGroup[];
  isLoading: boolean;
  styles: Record<string, string>;
  hideSubtotals: boolean;
  isMobile?: boolean;
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
                                hideSubtotals,
                                isMobile = false
                              }: EstimateTableProps) => {
  if (!groups || groups.length === 0) {
    return (
        <div className="p-4 text-center text-gray-500">
          <EstimateAnimation className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2" />
          <p className="text-sm sm:text-base">Preparing estimate...</p>
        </div>
    );
  }

  // Mobile layout renders a card-based view for each item
  if (isMobile) {
    return (
        <div className="space-y-4">
          {groups.map((group, index) => (
              <div key={index} className={cn(styles.section, "pb-4")}>
                <h3 className={cn(styles.groupTitle, "text-base font-semibold mb-2")}>{group.name}</h3>
                {group.description && (
                    <p className="text-xs text-gray-600 mb-3">{group.description}</p>
                )}

                <div className="space-y-3">
                  {group.subgroups?.map((subgroup, subgroupIndex) => (
                      <div key={`subgroup-${subgroupIndex}`} className="space-y-2">
                        {subgroup.items?.map((item, itemIndex) => (
                            <div
                                key={`${subgroup.name}-${itemIndex}`}
                                className={cn(
                                    "border rounded-md p-3 bg-white shadow-sm",
                                    isLoading && "animate-pulse bg-gray-50"
                                )}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="font-medium text-sm">{item.title}</div>
                                <div className="text-sm font-semibold">{formatCurrency(item.totalPrice)}</div>
                              </div>

                              {item.description && (
                                  <div className="text-xs text-gray-600 mb-2">{item.description}</div>
                              )}

                              <div className="flex justify-between text-xs text-gray-500">
                                <div>Qty: {item.quantity.toLocaleString()}</div>
                                <div>Price: {formatCurrency(item.unitAmount)}</div>
                              </div>
                            </div>
                        ))}

                        {!hideSubtotals && subgroup.items?.length > 0 && (
                            <div className="flex justify-between items-center pt-1 pb-2 px-2 border-t border-gray-200">
                              <div className="text-xs font-medium">Subtotal for {subgroup.name}</div>
                              <div className="text-sm font-medium">{formatCurrency(subgroup.subtotal)}</div>
                            </div>
                        )}
                      </div>
                  ))}
                </div>
              </div>
          ))}
        </div>
    );
  }

  // Desktop layout uses traditional table
  return (
      <div className="space-y-6">
        {groups.map((group, index) => (
            <div key={index} className={styles.section}>
              <h3 className={styles.groupTitle}>{group.name}</h3>
              {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
              )}

              <div className="overflow-x-auto">
                <table className={styles.table}>
                  <thead>
                  <tr>
                      <th className={cn(styles.tableHeader, "w-[38%]")}>Item</th>
                    <th className={cn(styles.tableHeader, "w-[35%]")}>Description</th>
                    <th className={cn(styles.tableHeader, "w-[7%] text-right")}>Qty</th>
                    <th className={cn(styles.tableHeader, "w-[7%] text-right")}>Price</th>
                    <th className={cn(styles.tableHeader, "w-[6%] text-right")}>Total</th>
                  </tr>
                  </thead>
                  <tbody>
                  {group.subgroups?.map((subgroup, subgroupIndex) => (
                      <React.Fragment key={`subgroup-${subgroupIndex}`}>
                        {subgroup.items?.map((item, itemIndex) => (
                            <tr
                                key={`${subgroup.name}-${itemIndex}`}
                                className={cn(
                                    styles.tableRow,
                                    // isLoading && "animate-pulse bg-gray-50"
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
                                  <>
                                    {item.description}
                                    {item.costType && (
                                      <span className="ml-2 inline-block rounded-full bg-gray-100 px-2 py-[1px] text-[12px] text-gray-800 shadow">
                                        {item.costType}
                                      </span>
                                    )}
                                  </>
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
                      </React.Fragment>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
        ))}
      </div>
  );
};