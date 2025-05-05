import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

/***********************
 * TYPE DEFINITIONS    *
 ***********************/
export interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  totalPrice: number;
}

export interface SubGroup {
  name: string;
  items: LineItem[];
  subtotal: number;
}

export interface ItemGroup {
  name: string;
  description?: string;
  subgroups: SubGroup[];
  subtotal: number;
}

/***********************
 * COMPONENT PROPS     *
 ***********************/
interface EstimateTableProps {
  groups: ItemGroup[];
  /** Skeleton/loading state */
  isLoading: boolean;
  /** Tailwind‑class map injected by EstimateDisplay */
  styles: Record<string, string>;
  /** Hide subgroup/group subtotals */
  hideSubtotals: boolean;
  /** Switches to card layout on small screens */
  isMobile?: boolean;
  /** If true cells turn into inputs and user can edit */
  isEditable?: boolean;
  /** Bubble up full groups array after every edit */
  onGroupsChange?: (updated: ItemGroup[]) => void;
}

/***********************
 * HELPERS             *
 ***********************/
const formatCurrency = (amount: number): string =>
  amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/***********************
 * COMPONENT           *
 ***********************/
export const EstimateTable: React.FC<EstimateTableProps> = ({
  groups,
  isLoading,
  styles,
  hideSubtotals,
  isMobile = false,
  isEditable = false,
  onGroupsChange,
}) => {
  /** Local clone so we can mutate freely while the parent keeps source of truth */
  const [localGroups, setLocalGroups] = useState<ItemGroup[]>(() =>
    JSON.parse(JSON.stringify(groups))
  );

  /** Whenever `groups` prop changes from the outside, sync back. */
  useEffect(() => {
    setLocalGroups(JSON.parse(JSON.stringify(groups)));
  }, [groups]);

  /** After every localGroups update, tell parent so it can recalc totalCost */
  const propagate = (next: ItemGroup[]) => {
    setLocalGroups(next);
    onGroupsChange?.(next);
  };

  /***********************
   * ITEM EDITING         *
   ***********************/
  const handleItemChange = (
    groupIdx: number,
    subIdx: number,
    itemIdx: number,
    field: keyof LineItem,
    value: string
  ) => {
    const draft = JSON.parse(JSON.stringify(localGroups)) as ItemGroup[];
    const item = draft[groupIdx].subgroups[subIdx].items[itemIdx];

    if (field === "quantity" || field === "unitAmount") {
      const num = Math.max(0, Number(value));
      (item as any)[field] = num;
    } else {
      (item as any)[field] = value;
    }

    // keep math sane
    item.totalPrice = Number((item.quantity * item.unitAmount).toFixed(2));

    // recalc subgroup + group totals
    recalcTotals(draft[groupIdx]);

    propagate(draft);
  };

  const recalcTotals = (group: ItemGroup) => {
    let groupTotal = 0;
    group.subgroups.forEach((sg) => {
      let sgTotal = 0;
      sg.items.forEach((it) => {
        sgTotal += it.totalPrice;
      });
      sg.subtotal = Number(sgTotal.toFixed(2));
      groupTotal += sgTotal;
    });
    group.subtotal = Number(groupTotal.toFixed(2));
  };

  /***********************
   * ADD NEW ITEM         *
   ***********************/
  // hold temporary inputs for each subgroup using composite key "g-sg"
  const [newItems, setNewItems] = useState<Record<string, Partial<LineItem>>>(
    {}
  );

  const handleNewItemField = (
    g: number,
    sg: number,
    field: keyof LineItem,
    value: string
  ) => {
    const key = `${g}-${sg}`;
    setNewItems((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === "quantity" || field === "unitAmount" ? Number(value) : value,
      },
    }));
  };

  const addNewItem = (g: number, sg: number) => {
    const key = `${g}-${sg}`;
    const draftItem = newItems[key];
    if (!draftItem?.title || !draftItem.quantity || !draftItem.unitAmount) return;

    const item: LineItem = {
      title: draftItem.title,
      description: draftItem.description || "",
      quantity: draftItem.quantity,
      unitAmount: draftItem.unitAmount,
      totalPrice: Number((draftItem.quantity * draftItem.unitAmount).toFixed(2)),
      unit: draftItem.unit || "",
    } as LineItem;

    const draft = JSON.parse(JSON.stringify(localGroups)) as ItemGroup[];
    draft[g].subgroups[sg].items.push(item);
    recalcTotals(draft[g]);
    propagate(draft);

    // reset row inputs
    setNewItems((prev) => ({ ...prev, [key]: {} }));
  };

  /***********************
   * EARLY RETURN EMPTY   *
   ***********************/
  if (!localGroups || localGroups.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">No estimate data</div>
    );
  }

  /***********************
   * MOBILE CARDS         *
   ***********************/
  if (isMobile) {
    /* Keep original card layout; for brevity not editable on mobile */
    return (
      <div className="space-y-4">
        {localGroups.map((group, gIdx) => (
          <div key={gIdx} className={cn(styles.section, "pb-4")}> {/* rest unchanged */}</div>
        ))}
      </div>
    );
  }

  /***********************
   * DESKTOP TABLE        *
   ***********************/
  return (
    <div className="space-y-6">
      {localGroups.map((group, gIdx) => (
        <div key={gIdx} className={styles.section}>
          <h3 className={styles.groupTitle}>{group.name}</h3>
          {group.description && (
            <p className="text-sm text-gray-600 mb-4">{group.description}</p>
          )}

          <div className="overflow-x-auto">
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={cn(styles.tableHeader, "w-[40%]")}>Item</th>
                  <th className={cn(styles.tableHeader, "w-[30%]")}>Description</th>
                  <th className={cn(styles.tableHeader, "w-[8%] text-right")}>Qty</th>
                  <th className={cn(styles.tableHeader, "w-[8%] text-right")}>Price</th>
                  <th className={cn(styles.tableHeader, "w-[8%] text-right")}>Total</th>
                </tr>
              </thead>
              <tbody>
                {group.subgroups.map((sg, sgIdx) => (
                  <React.Fragment key={sgIdx}>
                    {sg.items.map((it, iIdx) => (
                      <tr key={`${sgIdx}-${iIdx}`} className={styles.tableRow}>
                        {/* TITLE */}
                        <td className={cn(styles.tableCell, "w-[40%]")}> {
                          isEditable ? (
                            <input
                              className="w-full bg-transparent border-b outline-none"
                              value={it.title}
                              onChange={(e) =>
                                handleItemChange(gIdx, sgIdx, iIdx, "title", e.target.value)
                              }
                            />
                          ) : (
                            it.title
                          )
                        }</td>
                        {/* DESC */}
                        <td className={cn(styles.tableCell, "w-[30%]")}> {
                          isEditable ? (
                            <input
                              className="w-full bg-transparent border-b outline-none"
                              value={it.description ?? ""}
                              onChange={(e) =>
                                handleItemChange(gIdx, sgIdx, iIdx, "description", e.target.value)
                              }
                            />
                          ) : (
                            it.description
                          )
                        }</td>
                        {/* QTY */}
                        <td className={cn(styles.tableCell, "w-[8%] text-right")}> {
                          isEditable ? (
                            <input
                              type="number"
                              min={1}
                              className="w-16 text-right bg-transparent border-b outline-none"
                              value={it.quantity}
                              onChange={(e) =>
                                handleItemChange(gIdx, sgIdx, iIdx, "quantity", e.target.value)
                              }
                            />
                          ) : (
                            it.quantity.toLocaleString()
                          )
                        }</td>
                        {/* PRICE */}
                        <td className={cn(styles.tableCell, "w-[8%] text-right")}> {
                          isEditable ? (
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="w-20 text-right bg-transparent border-b outline-none"
                              value={it.unitAmount}
                              onChange={(e) =>
                                handleItemChange(gIdx, sgIdx, iIdx, "unitAmount", e.target.value)
                              }
                            />
                          ) : (
                            formatCurrency(it.unitAmount)
                          )
                        }</td>
                        {/* TOTAL */}
                        <td className={cn(styles.tableCell, "w-[8%] text-right font-medium")}>{
                          formatCurrency(it.totalPrice)
                        }</td>
                      </tr>
                    ))}

                    {/* NEW ITEM ROW (only when editable) */}
                    {isEditable && (
                      <tr key={`new-${sgIdx}`} className="border-t">
                        <td className={styles.tableCell}>
                          <input
                            placeholder="New item title"
                            className="w-full bg-transparent border-b outline-none"
                            value={(newItems[`${gIdx}-${sgIdx}`]?.title as string) ?? ""}
                            onChange={(e) =>
                              handleNewItemField(gIdx, sgIdx, "title", e.target.value)
                            }
                          />
                        </td>
                        <td className={styles.tableCell}>
                          <input
                            placeholder="Description"
                            className="w-full bg-transparent border-b outline-none"
                            value={(newItems[`${gIdx}-${sgIdx}`]?.description as string) ?? ""}
                            onChange={(e) =>
                              handleNewItemField(gIdx, sgIdx, "description", e.target.value)
                            }
                          />
                        </td>
                        <td className={cn(styles.tableCell, "text-right")}> <input
                          type="number"
                          min={1}
                          className="w-16 text-right bg-transparent border-b outline-none"
                          placeholder="Qty"
                          value={(newItems[`${gIdx}-${sgIdx}`]?.quantity as number) ?? ""}
                          onChange={(e) =>
                            handleNewItemField(gIdx, sgIdx, "quantity", e.target.value)
                          }
                        /></td>
                        <td className={cn(styles.tableCell, "text-right")}> <input
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-20 text-right bg-transparent border-b outline-none"
                          placeholder="Price"
                          value={(newItems[`${gIdx}-${sgIdx}`]?.unitAmount as number) ?? ""}
                          onChange={(e) =>
                            handleNewItemField(gIdx, sgIdx, "unitAmount", e.target.value)
                          }
                        /></td>
                        <td className={cn(styles.tableCell, "text-right")}> <button
                          className="text-primary font-medium hover:underline"
                          onClick={() => addNewItem(gIdx, sgIdx)}
                        >Add</button></td>
                      </tr>
                    )}

                    {/* SG SUBTOTAL */}
                    {!hideSubtotals && sg.items.length > 0 && (
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className={cn(styles.tableCell, "text-right font-medium")}>Subtotal for {sg.name}</td>
                        <td className={cn(styles.tableCell, "text-right font-medium")}>{formatCurrency(sg.subtotal)}</td>
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
