
import React from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AIPreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contractorId?: string;
}

export const AIPreferencesDialog = ({ isOpen, onClose, contractorId }: AIPreferencesDialogProps) => {
  const { data: aiRates } = useQuery({
    queryKey: ["ai-rates", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_rates")
        .select("*")
        .eq("contractor_id", contractorId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!contractorId,
  });

  const handleSaveRates = async (rates: any[]) => {
    if (!contractorId) return;

    const { error } = await supabase
      .from("ai_rates")
      .upsert(
        rates.map(rate => ({
          ...rate,
          contractor_id: contractorId
        }))
      );

    if (error) {
      console.error("Error saving AI rates:", error);
    }
  };

  return (
    <SettingsDialog
      title="AI Settings"
      description="Configure AI preferences and rates for estimate generation"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="space-y-6">
        <AIPreferencesSettings />
        <AIRateForm 
          rates={aiRates || []} 
          onSave={handleSaveRates}
        />
      </div>
    </SettingsDialog>
  );
};
