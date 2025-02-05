import { useEffect } from "react";

interface EstimateDisplayProps {
  groups: any[];
  totalCost: number;
  isBlurred?: boolean;
  contractor?: {
    business_name?: string;
    business_logo_url?: string;
    branding_colors?: {
      primary: string;
      secondary: string;
    };
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
  useEffect(() => {
    if (contractor?.branding_colors) {
      const colors = contractor.branding_colors;
      document.documentElement.style.setProperty('--primary', colors.primary);
      document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');
      document.documentElement.style.setProperty('--secondary', colors.secondary);
      document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');

      // Update primary color variations
      const primaryHex = colors.primary.replace('#', '');
      const r = parseInt(primaryHex.slice(0, 2), 16);
      const g = parseInt(primaryHex.slice(2, 4), 16);
      const b = parseInt(primaryHex.slice(4, 6), 16);

      document.documentElement.style.setProperty('--primary-100', `rgba(${r}, ${g}, ${b}, 0.1)`);
      document.documentElement.style.setProperty('--primary-200', `rgba(${r}, ${g}, ${b}, 0.2)`);
      document.documentElement.style.setProperty('--primary-300', `rgba(${r}, ${g}, ${b}, 0.4)`);
      document.documentElement.style.setProperty('--primary-400', `rgba(${r}, ${g}, ${b}, 0.6)`);
      document.documentElement.style.setProperty('--primary-500', `rgba(${r}, ${g}, ${b}, 0.8)`);
      document.documentElement.style.setProperty('--primary-600', colors.primary);
      document.documentElement.style.setProperty('--primary-700', `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`);
    }
  }, [contractor?.branding_colors]);

  return (
    <div className={`estimate-display ${isBlurred ? 'blurred' : ''}`}>
      <h1 className="text-2xl font-bold">Estimate Summary</h1>
      {projectSummary && <p className="text-lg">{projectSummary}</p>}
      {groups.map((group, index) => (
        <div key={index} className="estimate-group">
          <h2 className="text-xl font-semibold">{group.name}</h2>
          {group.subgroups.map((subgroup, subIndex) => (
            <div key={subIndex} className="estimate-subgroup">
              <h3 className="text-lg font-medium">{subgroup.name}</h3>
              <ul>
                {subgroup.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="estimate-item">
                    <span>{item.title}</span>
                    <span>{item.quantity} x ${item.unitAmount.toFixed(2)} = ${item.totalPrice.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <p className="subtotal">Subtotal: ${subgroup.subtotal.toFixed(2)}</p>
            </div>
          ))}
        </div>
      ))}
      <h2 className="text-xl font-bold">Total Cost: ${totalCost.toFixed(2)}</h2>
    </div>
  );
};
