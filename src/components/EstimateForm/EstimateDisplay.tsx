import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  totalPrice: number;
}

interface ItemGroup {
  name: string;
  description?: string;
  items: LineItem[];
}

interface EstimateDisplayProps {
  groups: ItemGroup[];
  totalCost: number;
  isBlurred?: boolean;
  contractor?: {
    businessName?: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export const EstimateDisplay = ({ 
  groups, 
  totalCost, 
  isBlurred = false,
  contractor 
}: EstimateDisplayProps) => {
  return (
    <Card className={cn(
      "p-8 max-w-4xl mx-auto transition-all duration-500",
      isBlurred && "blur-md pointer-events-none"
    )}>
      {/* Contractor Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b">
        <div className="flex items-center space-x-4">
          {contractor?.logoUrl && (
            <img 
              src={contractor.logoUrl} 
              alt={`${contractor?.businessName || 'Business'} logo`}
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{contractor?.businessName || 'Project Estimate'}</h1>
            {contractor?.contactEmail && (
              <p className="text-sm text-muted-foreground">{contractor.contactEmail}</p>
            )}
            {contractor?.contactPhone && (
              <p className="text-sm text-muted-foreground">{contractor.contactPhone}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-medium">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Estimate Groups */}
      <div className="space-y-8">
        {groups.map((group, index) => (
          <div key={index} className="bg-gray-50 p-6 rounded-lg">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
              )}
            </div>

            {/* Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Item</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Description</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Qty</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Unit Price</th>
                    <th className="text-right py-2 px-4 text-sm font-medium text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item, itemIndex) => (
                    <tr key={itemIndex} className="border-b border-gray-100">
                      <td className="py-3 px-4">{item.title}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{item.description}</td>
                      <td className="py-3 px-4 text-right">{item.quantity} {item.unit}</td>
                      <td className="py-3 px-4 text-right">${item.unitAmount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium">${item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Group Subtotal */}
            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <p className="font-medium">Subtotal for {group.name}</p>
              <p className="font-semibold">
                ${group.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Total */}
      <div className="mt-8 pt-6 border-t">
        <div className="flex justify-between items-center">
          <p className="text-xl font-semibold">Total Estimate</p>
          <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
        </div>
      </div>
    </Card>
  );
};