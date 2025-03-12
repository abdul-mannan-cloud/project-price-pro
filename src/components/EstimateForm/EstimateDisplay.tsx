import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTemplateStyles } from "@/lib/template-styles";
import { useToast } from "@/hooks/use-toast";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { SignatureDialog } from "./SignatureDialog";
import { EstimateSkeleton } from "./EstimateSkeleton";
import { EstimateAnimation } from "./EstimateAnimation";
import { EstimateHeader } from "./EstimateHeader";
import { EstimateActions } from "./EstimateActions";
import { EstimateTable } from "./EstimateTable";
import { EstimateTotals } from "./EstimateTotals";
import { EstimateSignature } from "./EstimateSignature";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export interface LineItem {
  title: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitAmount: number;
  totalPrice: number;
}

export interface SubGroup {
  name: string;
  items: LineItem[];
  subtotal: number;
}

export interface ItemGroup {
  name: string;
  description?: string;
  subgroups: SubGroup[];
}

export type ContractorDisplay = {
  business_name?: string;
  business_logo_url?: string | null;
  contact_email?: string;
  contact_phone?: string | null;
  branding_colors?: Json | null;
  contractor_settings?: {
    estimate_template_style?: string;
    estimate_client_message?: string;
    estimate_footer_text?: string;
    estimate_signature_enabled?: boolean;
    estimate_hide_subtotals?: boolean;
    estimate_compact_view?: boolean;
  };
};

interface ContractorSettings {
  estimate_template_style?: string;
  estimate_client_message?: string;
  estimate_footer_text?: string;
  estimate_signature_enabled?: boolean;
  estimate_hide_subtotals?: boolean;
  estimate_compact_view?: boolean;
}

interface EstimateDisplayProps {
  groups: ItemGroup[];
  totalCost: number;
  isBlurred?: boolean;
  contractor?: ContractorDisplay;
  projectSummary?: string;
  isEditable?: boolean;
  onEstimateChange?: (estimate: any) => void;
  onSignatureComplete?: (initials: string) => void;
  projectImages?: string[];
  estimate?: any;
  isLoading?: boolean;
  handleRefreshEstimate: (id: string) => void;
  leadId: string;
  contractorParam?: string;
}

export const EstimateDisplay = ({
                                  groups = [],
                                  totalCost = 0,
                                  isBlurred = false,
                                  contractor,
                                  projectSummary,
                                  isEditable = false,
                                  onEstimateChange,
                                  onSignatureComplete,
                                  projectImages = [],
                                  estimate,
                                  isLoading: initialLoading = false,
                                  handleRefreshEstimate,
                                  leadId,
                                  contractorParam
                                }: EstimateDisplayProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const [contractorId, setContractorId] = useState<string>(contractorParam);
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isEstimateReady, setIsEstimateReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if the screen is mobile-sized
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");

  useEffect(() => {
    if (!contractorId) {
      getContractorId();
    }
  }, [contractorId]);

  const getContractorId = async () => {
    const lead = await supabase
        .from('leads')
        .select('contractor_id')
        .eq('id', leadId)
        .single();
    setContractorId(lead.data.contractor_id);
  };

  const { data: leadData } = useQuery({
    queryKey: ['estimate-status', leadId],
    queryFn: async () => {
      if (!leadId) return null;

      const { data, error } = await supabase
          .from('leads')
          .select('estimate_data, status')
          .eq('id', leadId)
          .maybeSingle();

      if (error) {
        console.error('Error fetching lead:', error);
        return null;
      }

      return data;
    },
    refetchInterval: !isEstimateReady ? 3000 : false,
    enabled: !!leadId
  });

  const { data: settings } = useQuery({
    queryKey: ["contractor-settings", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
          .from("contractor_settings")
          .select("*")
          .eq("id", contractorId)
          .single();

      if (error) throw error;
      return data as ContractorSettings;
    },
    enabled: !!contractorId
  });

  useEffect(() => {
    if (leadData) {
      const isComplete = !!leadData.estimate_data && leadData.status === 'complete';
      setIsEstimateReady(isComplete);

      if (isComplete && onEstimateChange) {
        onEstimateChange(leadData.estimate_data);
      }
    }
  }, [leadData]);

  useEffect(() => {
    const hasValidEstimate = groups?.length > 0 && totalCost > 0;
    setIsEstimateReady(hasValidEstimate);
  }, [groups, totalCost]);

  useEffect(() => {
    const checkContractorAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: contractor } = await supabase.from('contractors').select('id').eq('user_id', user.id).maybeSingle();
      if (user && contractor.id === contractorParam) {
        setIsContractor(true);
      }
    };
    checkContractorAccess();
  }, [contractorId]);

  const handleSignature = (initials: string) => {
    setSignature(initials);
    if (onSignatureComplete) {
      onSignatureComplete(initials);
    }
  };

  const templateSettings = settings || {
    estimate_template_style: 'modern',
    estimate_signature_enabled: false,
    estimate_client_message: '',
    estimate_footer_text: '',
    estimate_hide_subtotals: false,
    estimate_compact_view: true
  };

  const styles = getTemplateStyles(templateSettings.estimate_template_style);

  if (isLoading) {
    return <EstimateSkeleton />;
  }

  return (
      <>
        {!isEstimateReady && (
            <div className="fixed top-0 left-0 right-0 bg-primary text-white p-2 sm:p-4 text-center z-50 animate-in fade-in-0">
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4">
                  {/*<EstimateAnimation />*/}
                </div>
                <span className="text-xs sm:text-sm">Generating your estimate...</span>
              </div>
            </div>
        )}

        <Card className={cn(styles.card, isBlurred && "blur-md pointer-events-none", "max-w-full mx-auto overflow-hidden")}>
          <div id="estimate-content" className="p-2 sm:p-4 md:p-6">
            <div className={cn("flex flex-col sm:flex-row justify-between gap-4 sm:gap-2", isMobile ? "mb-4" : "")}>
              <EstimateHeader contractor={contractor} styles={styles} />

              <div className={cn(styles.headerContent, "mt-2 sm:mt-0")}>
                <EstimateActions
                    isContractor={isContractor}
                    companyName={contractor?.business_name || 'Estimate'}
                    onRefreshEstimate={async () => {
                      handleRefreshEstimate(leadId);
                    }}
                    onShowSettings={() => setShowSettings(true)}
                    onShowAIPreferences={() => setShowAIPreferences(true)}
                    styles={styles}
                    groups={groups || []}
                    totalCost={totalCost || 0}
                    contractor={contractor}
                    projectSummary={projectSummary}
                    leadId={leadId}
                />
              </div>
            </div>

            {estimate?.ai_generated_title && (
                <h2 className={cn(styles.title, "mb-3 text-center text-base sm:text-lg md:text-xl")}>
                  {estimate.ai_generated_title}
                </h2>
            )}

            {(settings?.estimate_client_message || projectSummary) && (
                <div className={cn(styles.message, "mb-4 sm:mb-6 text-sm sm:text-base")}>
                  <p className={styles.text}>
                    {settings?.estimate_client_message || projectSummary}
                  </p>
                </div>
            )}

            {projectImages && projectImages.length > 0 && (
                <div className="mb-4 sm:mb-6 overflow-x-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {projectImages.map((image, index) => (
                        <div
                            key={index}
                            className="aspect-square relative rounded-lg overflow-hidden"
                        >
                          <img
                              src={image}
                              alt={`Project image ${index + 1}`}
                              className="w-full h-full object-cover"
                          />
                        </div>
                    ))}
                  </div>
                </div>
            )}

            <div className="overflow-x-auto">
              <EstimateTable
                  groups={groups}
                  isLoading={isLoading}
                  styles={styles}
                  hideSubtotals={templateSettings.estimate_hide_subtotals || false}
                  isMobile={isMobile}
              />
            </div>

            <EstimateTotals
                totalCost={totalCost}
                isEstimateReady={isEstimateReady}
                templateStyle={templateSettings.estimate_template_style || 'modern'}
                styles={styles}
            />

            {templateSettings?.estimate_footer_text && (
                <div className={cn("mt-6 sm:mt-8 pt-4 sm:pt-6 border-t", styles.text, "text-xs sm:text-sm")}>
                  <p className="whitespace-pre-wrap">
                    {templateSettings.estimate_footer_text}
                  </p>
                </div>
            )}

            {templateSettings?.estimate_signature_enabled && (
                <EstimateSignature
                    signature={signature}
                    isEstimateReady={isEstimateReady}
                    onSignatureClick={() => setShowSignatureDialog(true)}
                    styles={styles}
                />
            )}
          </div>
        </Card>

        <SignatureDialog
            isOpen={showSignatureDialog}
            onClose={() => setShowSignatureDialog(false)}
            onSign={handleSignature}
        />


        {isContractor && (
            <>
              {showSettings && (
                  <SettingsDialog
                      title="Estimate Settings"
                      description="Customize how your estimates appear to clients"
                      isOpen={showSettings}
                      onClose={() => setShowSettings(false)}
                  >
                    <EstimateTemplateSettings contractorId={contractorId} />
                  </SettingsDialog>
              )}
              {showAIPreferences && (
                  <SettingsDialog
                      title="AI Preferences"
                      description="Configure AI settings for estimate generation"
                      isOpen={showAIPreferences}
                      onClose={() => setShowAIPreferences(false)}
                  >
                    <AIPreferencesSettings key={`ai-preferences-${showAIPreferences}`} />
                  </SettingsDialog>
              )}
            </>
        )}
      </>
  );
};