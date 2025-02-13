
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTemplateStyles } from "@/lib/template-styles";
import { Database } from "@/integrations/supabase/types";
import { Json } from "@/integrations/supabase/types";
import { BrandingColors } from "@/types/settings";
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
  isLoading: initialLoading = false
}: EstimateDisplayProps) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPreferences, setShowAIPreferences] = useState(false);
  const { id, contractorId } = useParams();
  const [isContractor, setIsContractor] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [isEstimateReady, setIsEstimateReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: leadData } = useQuery({
    queryKey: ['estimate-status', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('leads')
        .select('estimate_data, status')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching lead:', error);
        return null;
      }

      return data;
    },
    refetchInterval: !isEstimateReady ? 3000 : false,
    enabled: !!id
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
      if (user && contractorId === user.id) {
        setIsContractor(true);
      }
    };
    checkContractorAccess();
  }, [contractorId]);

  const handleRefreshEstimate = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: estimate?.id,
          contractorId,
          refreshOnly: true
        }
      });

      if (error) throw error;

      toast({
        title: "Estimate refresh started",
        description: "Your estimate will be updated shortly.",
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      if (onEstimateChange) {
        onEstimateChange(data);
      }
    } catch (error) {
      console.error('Error refreshing estimate:', error);
      toast({
        title: "Error",
        description: "Failed to refresh the estimate. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="fixed top-0 left-0 right-0 bg-primary text-white p-4 text-center z-50 animate-in fade-in-0">
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4">
              <EstimateAnimation className="!bg-white/20" />
            </div>
            <span>Generating your estimate...</span>
          </div>
        </div>
      )}
      
      <Card className={cn(styles.card, isBlurred && "blur-md pointer-events-none")}>
        <div id="estimate-content">
          <EstimateHeader contractor={contractor} styles={styles} />
          
          <div className={styles.headerContent}>
            <EstimateActions
              isContractor={isContractor}
              companyName={contractor?.business_name || "Example Company"}
              onRefreshEstimate={handleRefreshEstimate}
              onShowSettings={() => setShowSettings(true)}
              onShowAIPreferences={() => setShowAIPreferences(true)}
              styles={styles}
            />
          </div>

          {/* AI Generated Title */}
          {estimate?.ai_generated_title && (
            <h2 className={cn(styles.title, "mb-4 text-center")}>
              {estimate.ai_generated_title}
            </h2>
          )}

          {/* AI Generated Message */}
          {(estimate?.ai_generated_message || projectSummary) && (
            <div className={cn(styles.message, "mb-6")}>
              <p className={styles.text}>
                {estimate?.ai_generated_message || projectSummary}
              </p>
            </div>
          )}

          {/* Project Images */}
          {projectImages && projectImages.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

          <EstimateTable
            groups={groups}
            isLoading={isLoading}
            styles={styles}
            hideSubtotals={templateSettings.estimate_hide_subtotals || false}
          />

          <EstimateTotals
            totalCost={totalCost}
            isEstimateReady={isEstimateReady}
            templateStyle={templateSettings.estimate_template_style || 'modern'}
            styles={styles}
          />

          {templateSettings?.estimate_signature_enabled && (
            <EstimateSignature
              signature={signature}
              isEstimateReady={isEstimateReady}
              onSignatureClick={() => setShowSignatureDialog(true)}
              styles={styles}
            />
          )}

          {/* Footer Text */}
          {templateSettings?.estimate_footer_text && (
            <div className={cn("mt-8 pt-6 border-t", styles.text)}>
              <p className="whitespace-pre-wrap text-sm">
                {templateSettings.estimate_footer_text}
              </p>
            </div>
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
          <SettingsDialog
            title="Estimate Settings"
            description="Customize how your estimates appear to clients"
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          >
            <EstimateTemplateSettings />
          </SettingsDialog>
          <SettingsDialog
            title="AI Preferences"
            description="Configure AI settings for estimate generation"
            isOpen={showAIPreferences}
            onClose={() => setShowAIPreferences(false)}
          >
            <AIPreferencesSettings />
          </SettingsDialog>
        </>
      )}
    </>
  );
};
