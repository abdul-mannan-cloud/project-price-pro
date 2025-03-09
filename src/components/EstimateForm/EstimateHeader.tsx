import { ContractorDisplay } from "./EstimateDisplay";
import { Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface EstimateHeaderProps {
  contractor: ContractorDisplay;
  styles: Record<string, string>;
}

export const EstimateHeader = ({ contractor, styles }: EstimateHeaderProps) => {
  const isMobile = useMediaQuery("(max-width: 640px)");

  const companyInfo = contractor || {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };

  return (
      <div className={cn(styles.header, "w-full")}>
        <div className={cn(styles.headerContent, "flex flex-row items-center")}>
          <div className={cn(styles.businessInfo, "flex", isMobile ? "items-center" : "items-start", "gap-2 sm:gap-4")}>
            {contractor?.business_logo_url && (
                <img
                    src={contractor.business_logo_url}
                    alt={`${companyInfo.business_name} logo`}
                    className={cn(
                        "object-contain rounded-lg",
                        isMobile ? "w-12 h-12" : "w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
                    )}
                />
            )}
            <div>
              <h1 className={cn(
                  styles.companyInfo,
                  isMobile ? "text-lg font-semibold" : "text-xl sm:text-2xl"
              )}>
                {companyInfo.business_name}
              </h1>
              <div className={cn(
                  styles.contactInfo,
                  "flex flex-col",
                  isMobile ? "text-xs" : "text-sm"
              )}>
                {companyInfo.contact_email && (
                    <a
                        href={`mailto:${companyInfo.contact_email}`}
                        className={cn(styles.contactLink, "flex items-center gap-1")}
                    >
                      <Mail className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                      <span className="truncate">{companyInfo.contact_email}</span>
                    </a>
                )}
                {companyInfo.contact_phone && (
                    <a
                        href={`tel:${companyInfo.contact_phone}`}
                        className={cn(styles.contactLink, "flex items-center gap-1")}
                    >
                      <Phone className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
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