
import { ContractorDisplay } from "./EstimateDisplay";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandingColors } from "@/types/settings";

interface EstimateHeaderProps {
  contractor: ContractorDisplay;
  styles: Record<string, string>;
}

export const EstimateHeader = ({ contractor, styles }: EstimateHeaderProps) => {
  const companyInfo = contractor || {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  return (
    <div className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.businessInfo}>
          {contractor?.business_logo_url && (
            <img 
              src={contractor.business_logo_url} 
              alt={`${companyInfo.business_name} logo`}
              className="w-24 h-24 object-contain rounded-lg"
            />
          )}
          <div>
            <h1 className={styles.companyInfo}>
              {companyInfo.business_name}
            </h1>
            <div className={styles.contactInfo}>
              {companyInfo.contact_email && (
                <a 
                  href={`mailto:${companyInfo.contact_email}`}
                  className={styles.contactLink}
                >
                  <Mail className="h-4 w-4" />
                  {companyInfo.contact_email}
                </a>
              )}
              {companyInfo.contact_phone && (
                <a 
                  href={`tel:${companyInfo.contact_phone}`}
                  className={styles.contactLink}
                >
                  <Phone className="h-4 w-4" />
                  {companyInfo.contact_phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
