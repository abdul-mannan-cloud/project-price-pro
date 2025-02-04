import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Edit, Send, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  totalPrice: number;
}

interface SubGroup {
  name: string;
  items: LineItem[];
  subtotal: number;
}

interface ItemGroup {
  name: string;
  description?: string;
  subgroups: SubGroup[];
}

interface EstimateDisplayProps {
  groups: ItemGroup[];
  totalCost: number;
  isBlurred?: boolean;
  contractor?: Database['public']['Tables']['contractors']['Row'] & {
    contractor_settings: Database['public']['Tables']['contractor_settings']['Row'] | null;
  };
  projectSummary?: string;
  isEditable?: boolean;
  onEstimateChange?: (newEstimate: any) => void;
}

export const EstimateDisplay = ({ 
  groups = [],
  totalCost = 0,
  isBlurred = false,
  contractor,
  projectSummary,
  isEditable = false,
  onEstimateChange
}: EstimateDisplayProps) => {
  const [selectedItem, setSelectedItem] = useState<{
    groupIndex: number;
    subgroupIndex: number;
    itemIndex: number;
    item: LineItem;
  } | null>(null);
  const isMobile = useIsMobile();

  const defaultCompany = {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  const companyInfo = contractor || defaultCompany;

  const handleItemChange = (
    groupIndex: number,
    subgroupIndex: number,
    itemIndex: number,
    field: keyof LineItem,
    value: any
  ) => {
    if (!isEditable || !onEstimateChange) return;

    const newGroups = [...groups];
    const item = newGroups[groupIndex].subgroups[subgroupIndex].items[itemIndex];
    
    (item[field] as any) = value;

    if (field === 'quantity' || field === 'unitAmount') {
      item.totalPrice = item.quantity * item.unitAmount;
    }

    newGroups[groupIndex].subgroups[subgroupIndex].subtotal = 
      newGroups[groupIndex].subgroups[subgroupIndex].items.reduce(
        (sum, item) => sum + item.totalPrice, 
        0
      );

    onEstimateChange({ groups: newGroups });
  };

  const formatItemTitle = (title: string, unit?: string) => {
    if (!unit) return title;
    return `${title} (${unit})`;
  };

  return (
    <div className="relative w-full h-full">
      {/* Action Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        {isEditable && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSelectedItem({
              groupIndex: 0,
              subgroupIndex: 0,
              itemIndex: 0,
              item: groups[0]?.subgroups[0]?.items[0] || {
                title: '',
                quantity: 0,
                unitAmount: 0,
                totalPrice: 0
              }
            })}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        <Button variant="default" size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <Card className={cn(
        "transition-all duration-500",
        "w-full h-full flex flex-col",
        isMobile ? "rounded-none" : "rounded-xl",
        isBlurred && "blur-md pointer-events-none"
      )}>
        <div className="flex-1 overflow-y-auto">
          <div className={cn(
            "w-full mx-auto",
            isMobile ? "p-0" : "max-w-6xl p-8"
          )}>
            {/* Company Header */}
            <div className={cn(
              "flex flex-col md:flex-row md:items-start justify-between mb-8 pb-6 border-b gap-4",
              isMobile && "px-4"
            )}>
              <div className="flex items-start justify-between w-full">
                <div className="flex items-start gap-4">
                  {contractor?.business_logo_url && (
                    <img 
                      src={contractor.business_logo_url} 
                      alt={`${companyInfo.business_name} logo`}
                      className="w-12 h-12 md:w-16 md:h-16 object-contain"
                    />
                  )}
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold">{companyInfo.business_name}</h1>
                    <p className="text-sm text-muted-foreground">{companyInfo.contact_email}</p>
                    <p className="text-sm text-muted-foreground">{companyInfo.contact_phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Summary */}
            {projectSummary && (
              <div className={cn("mb-8 bg-muted/50 p-4 rounded-lg", isMobile && "mx-4")}>
                <h2 className="text-lg font-semibold mb-2">Project Overview</h2>
                <p className="text-sm text-muted-foreground">{projectSummary}</p>
              </div>
            )}

            {/* Estimate Groups */}
            <div className={cn("space-y-6", isMobile && "px-4")}>
              {groups.map((group, groupIndex) => (
                <div key={groupIndex} className="bg-gray-50 p-4 md:p-6 rounded-lg">
                  <div className="mb-4">
                    {isEditable ? (
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) => {
                          const newGroups = [...groups];
                          newGroups[groupIndex].name = e.target.value;
                          onEstimateChange?.({ groups: newGroups });
                        }}
                        className="text-lg font-semibold bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none w-full"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold">{group.name}</h3>
                    )}
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    )}
                  </div>

                  {/* Subgroups */}
                  <div className="space-y-4">
                    {group.subgroups.map((subgroup, subIndex) => (
                      <div key={subIndex} className="bg-white p-4 rounded-md shadow-sm">
                        {isEditable ? (
                          <input
                            type="text"
                            value={subgroup.name}
                            onChange={(e) => {
                              const newGroups = [...groups];
                              newGroups[groupIndex].subgroups[subIndex].name = e.target.value;
                              onEstimateChange?.({ groups: newGroups });
                            }}
                            className="font-medium text-primary mb-3 bg-transparent border-b border-gray-300 focus:border-primary focus:outline-none w-full"
                          />
                        ) : (
                          <h4 className="font-medium mb-3 text-primary">{subgroup.name}</h4>
                        )}
                        
                        {/* Line Items */}
                        <div>
                          {/* Desktop Table View */}
                          <div className="hidden md:block">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Item</th>
                                  <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Description</th>
                                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Qty</th>
                                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Unit Price</th>
                                  <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Total</th>
                                  {isEditable && <th className="w-16"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {subgroup.items.map((item, itemIndex) => (
                                  <tr key={itemIndex} className="border-b border-gray-100">
                                    <td className="py-3 px-4">
                                      <span className="font-medium">{formatItemTitle(item.title, item.unit)}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">{item.description}</span>
                                    </td>
                                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                                    <td className="py-3 px-4 text-right">${item.unitAmount.toFixed(2)}</td>
                                    <td className="py-3 px-4 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
                                    {isEditable && (
                                      <td className="py-3 px-4">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => setSelectedItem({
                                            groupIndex,
                                            subgroupIndex: subIndex,
                                            itemIndex,
                                            item
                                          })}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Mobile View */}
                          <div className="md:hidden space-y-4">
                            {subgroup.items.map((item, itemIndex) => (
                              <div
                                key={itemIndex}
                                className="border-b border-gray-100 pb-4 last:border-0"
                                onClick={() => isEditable && setSelectedItem({
                                  groupIndex,
                                  subgroupIndex: subIndex,
                                  itemIndex,
                                  item
                                })}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium">{formatItemTitle(item.title, item.unit)}</p>
                                    {item.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Qty:</span>
                                    <span className="ml-1 font-medium">{item.quantity}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Price:</span>
                                    <span className="ml-1 font-medium">${item.unitAmount.toFixed(2)}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-medium">${item.totalPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Subgroup Subtotal */}
                        <div className="mt-4 pt-4 border-t flex justify-between items-center">
                          <p className="font-medium">Subtotal for {subgroup.name}</p>
                          <p className="font-semibold">${subgroup.subtotal.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Group Subtotal */}
                  <div className="mt-6 pt-4 border-t flex justify-between items-center">
                    <p className="font-medium">Subtotal for {group.name}</p>
                    <p className="font-semibold">
                      ${group.subgroups.reduce((sum, subgroup) => sum + subgroup.subtotal, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total Section */}
            <div className={cn("mt-8 pt-6 border-t space-y-4", isMobile && "px-4")}>
              <div className="flex justify-between items-center text-muted-foreground">
                <p>Subtotal</p>
                <p>${(totalCost * 0.8).toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <p>Tax (8.5%)</p>
                <p>${(totalCost * 0.085).toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <p>Service Fee (20%)</p>
                <p>${(totalCost * 0.2).toFixed(2)}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-xl font-semibold">Total Estimate</p>
                <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedItem && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Edit Item</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedItem(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <input
                    type="text"
                    value={selectedItem.item.title}
                    onChange={(e) => handleItemChange(
                      selectedItem.groupIndex,
                      selectedItem.subgroupIndex,
                      selectedItem.itemIndex,
                      'title',
                      e.target.value
                    )}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <input
                    type="text"
                    value={selectedItem.item.description || ''}
                    onChange={(e) => handleItemChange(
                      selectedItem.groupIndex,
                      selectedItem.subgroupIndex,
                      selectedItem.itemIndex,
                      'description',
                      e.target.value
                    )}
                    className="w-full mt-1 p-2 border rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <input
                      type="number"
                      value={selectedItem.item.quantity}
                      onChange={(e) => handleItemChange(
                        selectedItem.groupIndex,
                        selectedItem.subgroupIndex,
                        selectedItem.itemIndex,
                        'quantity',
                        parseFloat(e.target.value) || 0
                      )}
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit Price</label>
                    <input
                      type="number"
                      value={selectedItem.item.unitAmount}
                      onChange={(e) => handleItemChange(
                        selectedItem.groupIndex,
                        selectedItem.subgroupIndex,
                        selectedItem.itemIndex,
                        'unitAmount',
                        parseFloat(e.target.value) || 0
                      )}
                      className="w-full mt-1 p-2 border rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
