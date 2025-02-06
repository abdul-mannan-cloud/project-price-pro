
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Json } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface AIPreferences {
  rate: string;
  type: string;
  instructions: string;
}

interface ContractorSettings {
  ai_preferences: AIPreferences;
  ai_instructions: string;
}

interface SupabaseContractorSettings {
  ai_preferences: Json;
  ai_instructions: string | null;
}

interface AIPreferencesSettingsProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const defaultPreferences: AIPreferences = {
  rate: "HR",
  type: "material_labor",
  instructions: ""
};

export const AIPreferencesSettings = ({ isOpen, onClose }: AIPreferencesSettingsProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // First, fetch the authenticated user
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) {
        navigate("/login");
        return null;
      }
      return user;
    },
  });

  // Then, fetch settings only if we have a user
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["contractor-settings", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Convert Supabase data to our ContractorSettings type
      const supabaseData = data as SupabaseContractorSettings;
      const preferences = supabaseData?.ai_preferences as any || defaultPreferences;
      
      // Ensure we have all required fields with proper types
      const aiPreferences: AIPreferences = {
        rate: typeof preferences?.rate === 'string' ? preferences.rate : defaultPreferences.rate,
        type: typeof preferences?.type === 'string' ? preferences.type : defaultPreferences.type,
        instructions: typeof preferences?.instructions === 'string' ? preferences.instructions : defaultPreferences.instructions
      };
      
      return {
        ai_preferences: aiPreferences,
        ai_instructions: supabaseData?.ai_instructions || ""
      } as ContractorSettings;
    },
    enabled: !!user?.id, // Only run this query if we have a user ID
  });

  const updateSettings = useMutation({
    mutationFn: async (formData: ContractorSettings) => {
      if (!user?.id) throw new Error("No authenticated user");

      const aiPreferencesJson: { [key: string]: string } = {
        rate: formData.ai_preferences.rate,
        type: formData.ai_preferences.type,
        instructions: formData.ai_preferences.instructions
      };

      const { error } = await supabase
        .from("contractor_settings")
        .update({
          ai_preferences: aiPreferencesJson as Json,
          ai_instructions: formData.ai_instructions
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your AI preferences have been updated successfully.",
      });
      if (onClose) {
        onClose();
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle authentication error
  if (userError) {
    navigate("/login");
    return null;
  }

  if (userLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading preferences...</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: ContractorSettings = {
      ai_preferences: {
        rate: formData.get("rate") as string || defaultPreferences.rate,
        type: formData.get("type") as string || defaultPreferences.type,
        instructions: formData.get("instructions") as string || defaultPreferences.instructions
      },
      ai_instructions: formData.get("ai_instructions") as string || ""
    };
    updateSettings.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Rate Type</Label>
        <Input
          name="rate"
          defaultValue={settings?.ai_preferences.rate || defaultPreferences.rate}
          placeholder="e.g., HR for hourly rate"
        />
      </div>

      <div className="space-y-2">
        <Label>Calculation Type</Label>
        <Input
          name="type"
          defaultValue={settings?.ai_preferences.type || defaultPreferences.type}
          placeholder="e.g., material_labor"
        />
      </div>

      <div className="space-y-2">
        <Label>AI Instructions</Label>
        <Textarea
          name="instructions"
          defaultValue={settings?.ai_preferences.instructions || defaultPreferences.instructions}
          placeholder="Enter specific instructions for AI estimate generation..."
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label>Additional Instructions</Label>
        <Textarea
          name="ai_instructions"
          defaultValue={settings?.ai_instructions || ""}
          placeholder="Enter any additional AI instructions..."
          className="min-h-[100px]"
        />
      </div>

      <Button type="submit" disabled={updateSettings.isPending}>
        {updateSettings.isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};
