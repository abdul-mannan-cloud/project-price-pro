
import { ContractorDisplay } from "../EstimateDisplay";
import { Mail, Phone } from "lucide-react";

interface EstimateHeaderProps {
  contractor?: ContractorDisplay;
}

export const EstimateHeader = ({ contractor }: EstimateHeaderProps) => {
  const defaultCompany = {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  const companyInfo = contractor || defaultCompany;

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 pb-4 space-y-4 md:space-y-0">
      <div className="flex items-center gap-6">
        {contractor?.business_logo_url && (
          <img 
            src={contractor.business_logo_url} 
            alt={`${companyInfo.business_name} logo`}
            className="w-24 h-24 object-contain rounded-lg"
          />
        )}
        <div>
          <h1 className="text-gray-900 font-semibold">
            {companyInfo.business_name}
          </h1>
          <div className="text-gray-700 font-medium flex flex-col gap-1">
            {companyInfo.contact_email && (
              <a 
                href={`mailto:${companyInfo.contact_email}`}
                className="hover:underline text-primary transition-colors inline-flex items-center gap-2 text-sm"
              >
                <Mail className="h-4 w-4" />
                {companyInfo.contact_email}
              </a>
            )}
            {companyInfo.contact_phone && (
              <a 
                href={`tel:${companyInfo.contact_phone}`}
                className="hover:underline text-primary transition-colors inline-flex items-center gap-2 text-sm"
              >
                <Phone className="h-4 w-4" />
                {companyInfo.contact_phone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
