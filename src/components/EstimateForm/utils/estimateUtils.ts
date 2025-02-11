
export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const formatUnit = (unit: string): string => {
  return unit.toLowerCase();
};

export const formatItemTitle = (title: string, unit?: string) => {
  if (!unit) return title;
  return `${title} (${unit})`;
};
