import { Card } from "@/components/ui/card";

interface LineItem {
  title: string;
  quantity: number;
  unitAmount: number;
  totalPrice: number;
}

interface ItemGroup {
  name: string;
  items: LineItem[];
}

interface EstimateDisplayProps {
  groups: ItemGroup[];
  totalCost: number;
}

export const EstimateDisplay = ({ groups, totalCost }: EstimateDisplayProps) => {
  return (
    <Card className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">Your Project Estimate</h2>
      
      {groups.map((group, index) => (
        <div key={index} className="mb-8">
          <h3 className="text-lg font-semibold mb-4">{group.name}</h3>
          <div className="space-y-4">
            {group.items.map((item, itemIndex) => (
              <div key={itemIndex} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × ${item.unitAmount.toFixed(2)}
                  </p>
                </div>
                <p className="font-semibold">${item.totalPrice.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      <div className="mt-8 pt-4 border-t">
        <div className="flex justify-between items-center">
          <p className="text-xl font-semibold">Total Estimate</p>
          <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
        </div>
      </div>
    </Card>
  );
};