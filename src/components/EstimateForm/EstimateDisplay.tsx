import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

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
}

export const EstimateDisplay = ({ 
  groups, 
  totalCost, 
  isBlurred = false,
  contractor,
  projectSummary
}: EstimateDisplayProps) => {
  const defaultCompany = {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  const companyInfo = contractor || defaultCompany;

  return (
    <Card className={cn(
      "p-8 max-w-4xl mx-auto transition-all duration-500",
      isBlurred && "blur-md pointer-events-none"
    )}>
      {/* Company Header */}
      <div className="flex items-start justify-between mb-8 pb-6 border-b">
        <div className="flex items-center space-x-4">
          {contractor?.business_logo_url && (
            <img 
              src={contractor.business_logo_url} 
              alt={`${companyInfo.business_name} logo`}
              className="w-16 h-16 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{companyInfo.business_name}</h1>
            <p className="text-sm text-muted-foreground">{companyInfo.contact_email}</p>
            <p className="text-sm text-muted-foreground">{companyInfo.contact_phone}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Date</p>
          <p className="font-medium">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Project Summary */}
      {projectSummary && (
        <div className="mb-8 bg-muted/50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Project Overview</h2>
          <p className="text-sm text-muted-foreground">{projectSummary}</p>
        </div>
      )}

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

            {/* Subgroups */}
            <div className="space-y-6">
              {group.subgroups.map((subgroup, subIndex) => (
                <div key={subIndex} className="bg-white p-4 rounded-md">
                  <h4 className="font-medium mb-3">{subgroup.name}</h4>
                  
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
                        {subgroup.items.map((item, itemIndex) => (
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

                  {/* Subgroup Subtotal */}
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <p className="font-medium">Subtotal for {subgroup.name}</p>
                    <p className="font-semibold">
                      ${subgroup.items.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Group Subtotal */}
            <div className="mt-6 pt-4 border-t flex justify-between items-center">
              <p className="font-medium">Subtotal for {group.name}</p>
              <p className="font-semibold">
                ${group.subgroups.reduce((sum, subgroup) => 
                  sum + subgroup.items.reduce((itemSum, item) => itemSum + item.totalPrice, 0), 
                  0
                ).toFixed(2)}
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