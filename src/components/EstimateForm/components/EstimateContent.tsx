
import { ItemGroup, LineItem, SubGroup } from "../EstimateDisplay";

interface EstimateContentProps {
  groups: ItemGroup[];
  templateSettings: {
    estimate_template_style: string;
    estimate_hide_subtotals: boolean;
    estimate_compact_view: boolean;
  };
  formatCurrency: (amount: number) => string;
  formatUnit: (unit: string) => string;
  getTemplateStyles: (style: string) => Record<string, string>;
}

export const EstimateContent = ({ 
  groups, 
  templateSettings, 
  formatCurrency, 
  formatUnit,
  getTemplateStyles 
}: EstimateContentProps) => {
  const formatItemTitle = (title: string, unit?: string) => {
    if (!unit) return title;
    return `${title} (${unit})`;
  };

  return (
    <>
      {groups?.map((group, index) => (
        <div key={index} className={getTemplateStyles(templateSettings.estimate_template_style).section}>
          <h3 className={getTemplateStyles(templateSettings.estimate_template_style).groupTitle}>{group.name}</h3>
          
          {templateSettings.estimate_template_style === 'classic' ? (
            <div className="space-y-2">
              {group.subgroups?.map(subgroup => (
                <div key={subgroup.name} className="space-y-1">
                  {subgroup.items?.map((item, itemIndex) => (
                    <div key={`${subgroup.name}-${itemIndex}`} className={getTemplateStyles(templateSettings.estimate_template_style).tableRow}>
                      <div className={getTemplateStyles(templateSettings.estimate_template_style).tableCell}>
                        <span className="font-medium">{item.title}</span>
                        {item.unit && ` (${formatUnit(item.unit)})`}
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <div className="text-sm text-gray-600 mt-1">
                          {item.quantity.toLocaleString()} × {formatCurrency(item.unitAmount)} = {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!templateSettings.estimate_hide_subtotals && (
                    <div className={getTemplateStyles(templateSettings.estimate_template_style).subtotal}>
                      Subtotal for {subgroup.name}: {formatCurrency(subgroup.subtotal)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <table className={getTemplateStyles(templateSettings.estimate_template_style).table}>
                <thead>
                  <tr>
                    <th className={`${getTemplateStyles(templateSettings.estimate_template_style).tableHeader} w-[45%]`}>Item</th>
                    <th className={`${getTemplateStyles(templateSettings.estimate_template_style).tableHeader} w-[35%]`}>Description</th>
                    <th className={`${getTemplateStyles(templateSettings.estimate_template_style).tableHeader} w-[7%] text-right`}>Qty</th>
                    <th className={`${getTemplateStyles(templateSettings.estimate_template_style).tableHeader} w-[7%] text-right`}>Price</th>
                    <th className={`${getTemplateStyles(templateSettings.estimate_template_style).tableHeader} w-[6%] text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {group.subgroups?.map(subgroup => 
                    subgroup.items?.map((item, itemIndex) => (
                      <tr key={`${subgroup.name}-${itemIndex}`} className={getTemplateStyles(templateSettings.estimate_template_style).tableRow}>
                        <td className={`${getTemplateStyles(templateSettings.estimate_template_style).tableCell} w-[45%] break-words`}>
                          {formatItemTitle(item.title, item.unit)}
                        </td>
                        <td className={`${getTemplateStyles(templateSettings.estimate_template_style).tableCell} w-[35%] break-words`}>
                          {item.description}
                        </td>
                        <td className={`${getTemplateStyles(templateSettings.estimate_template_style).tableCell} w-[7%] text-right`}>
                          {item.quantity.toLocaleString()}
                        </td>
                        <td className={`${getTemplateStyles(templateSettings.estimate_template_style).tableCell} w-[7%] text-right`}>
                          {formatCurrency(item.unitAmount)}
                        </td>
                        <td className={`${getTemplateStyles(templateSettings.estimate_template_style).tableCell} w-[6%] text-right font-medium`}>
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Group Subtotal */}
          {!templateSettings.estimate_hide_subtotals && templateSettings.estimate_template_style !== 'minimal' && (
            <div className={`${getTemplateStyles(templateSettings.estimate_template_style).subtotal} mt-4 pt-3 border-t`}>
              <span className={getTemplateStyles(templateSettings.estimate_template_style).text}>Subtotal for {group.name}</span>
              <span className="font-semibold ml-4">
                {formatCurrency(group.subgroups?.reduce((sum, subgroup) => sum + (subgroup.subtotal || 0), 0))}
              </span>
            </div>
          )}
        </div>
      ))}
    </>
  );
};
