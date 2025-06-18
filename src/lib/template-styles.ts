export const getTemplateStyles = (templateStyle: string = "modern") => {
  const baseStyles = {
    card: "p-8 bg-white shadow-lg rounded-lg",
    header: "mb-8",
    headerContent: "flex justify-between items-start",
    businessInfo: "flex items-start gap-4",
    companyInfo: "text-2xl font-bold",
    contactInfo: "mt-2 space-y-1",
    contactLink:
      "flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900",
    buttonsContainer: "flex items-center gap-2 print:hidden",
    button: "text-gray-600 hover:text-gray-900",
    title: "text-2xl font-bold",
    message: "text-gray-600",
    text: "text-gray-600",
    section: "space-y-4",
    groupTitle: "text-xl font-semibold",
    table: "w-full",
    tableHeader:
      "text-left py-2 px-4 bg-gray-50 text-sm font-medium text-gray-600",
    tableRow: "border-b border-gray-100",
    tableCell: "py-2 px-4 text-sm",
    totalsSection: "mt-8 pt-6 border-t",
    totalsTable: "w-full max-w-md ml-auto",
    totalsRow: "text-right",
    totalsLabel: "py-2 px-4 text-sm font-medium text-gray-600",
    totalsValue: "py-2 px-4 text-sm font-medium",
    total: "text-xl font-bold",
    signatureBox: "border rounded-lg h-32 relative",
    signatureText: "text-lg font-medium",
    signatureDate: "text-sm text-gray-500 mt-1",
  };

  switch (templateStyle) {
    case "classic":
      return {
        ...baseStyles,
        card: "p-8 bg-white shadow-lg rounded-lg font-serif",
        table: "w-full border-collapse border border-gray-200",
        tableHeader:
          "text-left py-3 px-4 bg-gray-100 text-sm font-bold border-b border-gray-200",
        tableRow: "border-b border-gray-200",
        tableCell: "py-3 px-4 text-sm border-r border-gray-200",
      };

    case "minimal":
      return {
        ...baseStyles,
        card: "p-8 bg-white",
        tableHeader:
          "text-left py-2 px-4 border-b-2 border-gray-200 text-sm font-medium",
        tableRow: "border-b border-gray-100",
        tableCell: "py-3 px-4 text-sm",
      };

    case "bold":
      return {
        ...baseStyles,
        card: "p-8 bg-gray-900 text-white rounded-lg",
        tableHeader:
          "text-left py-3 px-4 bg-gray-800 text-sm font-bold text-white",
        tableRow: "border-b border-gray-800",
        tableCell: "py-3 px-4 text-sm text-gray-300",
        text: "text-gray-300",
        title: "text-2xl font-bold text-white",
        groupTitle: "text-xl font-semibold text-white",
      };

    case "excel":
      return {
        ...baseStyles,
        card: "p-4 bg-white shadow-sm border border-gray-200",
        table: "w-full border-collapse border border-gray-300",
        tableHeader:
          "text-left py-2 px-3 bg-gray-100 text-xs font-bold border border-gray-300",
        tableRow: "even:bg-gray-50",
        tableCell: "py-1.5 px-3 text-sm border border-gray-300",
      };

    default: // modern
      return baseStyles;
  }
};
