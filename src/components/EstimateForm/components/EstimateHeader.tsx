import React from 'react';
import { Mail, Phone, RefreshCw, Settings, Copy, FileDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ContractorDisplay } from '../types';
import { getTemplateStyles } from '../styles/templateStyles';
import { BrandingColors } from "@/types/settings";

interface EstimateHeaderProps {
  contractor?: ContractorDisplay;
  isContractor: boolean;
  onRefreshEstimate: () => void;
  onShowSettings: () => void;
  onShowAIPreferences: () => void;
  onCopyEstimate: () => void;
  onExportPDF: () => void;
  isLoading?: boolean;
  templateStyle?: string;
}

export const EstimateHeader: React.FC<EstimateHeaderProps> = ({
  contractor,
  isContractor,
  onRefreshEstimate,
  onShowSettings,
  onShowAIPreferences,
  onCopyEstimate,
  onExportPDF,
  isLoading,
  templateStyle = 'modern'
}) => {
  const styles = getTemplateStyles(
    templateStyle, 
    contractor?.branding_colors as BrandingColors | null
  );
  const defaultCompany = {
    business_name: "Example Company",
    contact_email: "contact@example.com",
    contact_phone: "(555) 123-4567"
  };
  const companyInfo = contractor || defaultCompany;

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
        <div className={styles.buttonsContainer} id="estimate-actions">
          {isContractor && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefreshEstimate}
                className={styles.button}
                title="Refresh estimate"
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowAIPreferences}
                className={styles.button}
                title="AI Preferences"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onShowSettings}
                className={styles.button}
                title="Template Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${styles.button}`}
            onClick={onCopyEstimate}
          >
            <Copy className="h-4 w-4" />
            Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${styles.button}`}
            onClick={onExportPDF}
          >
            <FileDown className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
