import { BrandingColors } from "@/types/settings";

export const getTemplateStyles = (style: string = 'modern', brandingColors?: BrandingColors | null) => {
  const baseStyles = {
    card: "bg-white p-4 md:p-8 max-w-5xl mx-auto",
    header: "flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 space-y-4 md:space-y-0",
    headerContent: "flex justify-between items-center w-full",
    businessInfo: "flex items-center gap-6",
    companyInfo: "text-gray-900 font-semibold",
    contactInfo: "text-gray-700 font-medium flex flex-col gap-1",
    contactLink: "hover:underline text-primary transition-colors inline-flex items-center gap-2 text-sm",
    title: "text-xl md:text-2xl font-bold",
    text: "text-gray-600 text-sm",
    section: "bg-white rounded-none mb-0 last:mb-4",
    table: "w-full",
    tableHeader: "text-xs uppercase tracking-wider py-2 px-4 text-left border-b text-black",
    tableRow: "border-b hover:bg-gray-50 transition-colors",
    tableCell: "py-3 px-4 text-sm border-r last:border-r-0 break-words text-black",
    total: "text-2xl md:text-3xl font-bold",
    button: "bg-gray-100 hover:bg-gray-200",
    message: "bg-gray-50 p-4 rounded-lg text-sm",
    groupTitle: "text-base font-bold mb-2 w-full",
    subtotal: "text-right py-2 px-4 text-sm font-medium text-black",
    totalsSection: "space-y-4 mt-8 pt-6 border-t",
    totalsRow: "flex justify-between items-center py-2",
    buttonsContainer: "flex items-center gap-2 ml-auto",
    signatureBox: "h-32 rounded-lg transition-colors",
    signatureText: "font-['Dancing_Script'] text-2xl font-bold text-gray-800",
    signatureDate: "text-sm text-gray-500 mt-1",
    totalsTable: "w-full border-collapse",
    totalsLabel: "py-2 px-4 text-sm font-medium text-left border",
    totalsValue: "py-2 px-4 text-sm text-right border"
  };

  switch (style) {
    case 'minimal':
      return {
        ...baseStyles,
        card: "bg-white p-4 md:p-8 max-w-5xl mx-auto",
        header: "flex flex-col md:flex-row md:items-start justify-between mb-12 space-y-4 md:space-y-0",
        title: "text-xl md:text-2xl font-light tracking-wide",
        text: "text-gray-600 text-sm font-light",
        table: "w-full border-t border-gray-200",
        tableHeader: "text-xs uppercase tracking-wide py-4 px-4 text-left text-gray-600 font-light",
        tableRow: "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
        tableCell: "py-4 px-4 text-sm border border-gray-300 break-words text-gray-800 font-light",
        total: "text-2xl md:text-3xl font-bold",
        message: "bg-gray-50/50 p-6 rounded-none text-sm font-light",
        groupTitle: "text-base font-light mb-4 w-full uppercase tracking-wide",
        subtotal: "text-right py-4 px-4 text-sm font-light text-gray-600",
        totalsSection: "space-y-6 mt-12 pt-6 border-t",
        totalsRow: "flex justify-between items-center py-3 text-gray-800 font-light",
        totalsTable: baseStyles.totalsTable,
        totalsLabel: "py-2 px-4 text-sm font-light text-left border border-gray-200",
        totalsValue: "py-2 px-4 text-sm font-light text-right border border-gray-200"
      };

    case 'excel':
      return {
        ...baseStyles,
        card: "bg-white p-0 max-w-5xl mx-auto shadow-sm border border-gray-300",
        header: "flex flex-col md:flex-row md:items-start justify-between p-4 md:p-6 bg-[#F8F9FA] border-b space-y-4 md:space-y-0",
        title: "text-xl md:text-2xl font-normal font-['Calibri']",
        text: "text-gray-700 text-sm font-['Calibri']",
        section: "p-4 md:p-6",
        table: "w-full border-collapse",
        tableHeader: "text-xs font-bold bg-[#E9ECEF] py-2 px-3 text-left border border-gray-300 text-black font-['Calibri']",
        tableRow: "hover:bg-[#F8F9FA] transition-colors",
        tableCell: "py-2 px-3 text-sm border border-gray-300 break-words text-black font-['Calibri']",
        total: "text-xl md:text-2xl font-bold font-['Calibri']",
        message: "bg-[#F8F9FA] p-4 border text-sm font-['Calibri']",
        groupTitle: "text-base font-bold mb-3 w-full font-['Calibri']",
        subtotal: "text-right py-2 px-3 text-sm font-bold bg-[#F8F9FA] border border-gray-300 text-black font-['Calibri']",
        totalsSection: "mt-4",
        totalsTable: "w-full border-collapse",
        totalsRow: "border border-gray-300 font-['Calibri']",
        totalsLabel: "py-2 px-3 text-sm border border-gray-300 bg-[#F8F9FA] font-bold",
        totalsValue: "py-2 px-3 text-sm border border-gray-300 text-right"
      };

    default:
      const primaryColor = brandingColors?.primary || '#007AFF';
      return {
        ...baseStyles,
        card: "bg-white p-6 md:p-10 max-w-5xl mx-auto shadow-lg rounded-xl",
        header: "flex flex-col md:flex-row md:items-start justify-between mb-8 pb-6 border-b border-gray-100 space-y-4 md:space-y-0",
        title: `text-xl md:text-2xl font-semibold text-[${primaryColor}]`,
        text: "text-gray-600 text-sm leading-relaxed",
        table: "w-full rounded-lg overflow-hidden",
        tableHeader: "text-xs uppercase tracking-wider py-3 px-6 text-left bg-gray-50 text-gray-700 font-semibold",
        tableRow: "border-b border-gray-100 hover:bg-gray-50/50 transition-colors",
        tableCell: "py-4 px-6 text-sm break-words text-gray-800",
        total: `text-2xl md:text-3xl font-bold text-[${primaryColor}]`,
        message: "bg-gray-50 p-6 rounded-xl text-sm leading-relaxed",
        groupTitle: `text-lg font-semibold mb-4 w-full text-[${primaryColor}]`,
        subtotal: "text-right py-3 px-6 text-sm font-medium text-gray-700 bg-gray-50",
        totalsSection: "space-y-4 mt-8 pt-6 border-t border-gray-100",
        totalsRow: "flex justify-between items-center py-2 text-gray-800",
        totalsTable: baseStyles.totalsTable,
        totalsLabel: "py-2 px-6 text-sm font-medium text-left border-b",
        totalsValue: "py-2 px-6 text-sm font-medium text-right border-b"
      };
  }
};
