
import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Json } from "@/integrations/supabase/types";

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

const defaultPreferences: AIPreferences = {
  rate: "HR",
  type: "material_labor",
  instructions: ""
};

export const AIPreferencesSettings = () => {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const contractor = await supabase
          .from("contractors")
          .select("*")
          .eq("user_id", user.id)
          .single();

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", contractor.data.id)


      const contractors = data[0]

      if (error) {
        console.log('supabase Ai preferences error:', error )
        throw error
      };

      const supabaseData = contractors as SupabaseContractorSettings;
      const preferences = supabaseData.ai_preferences as any;

      // Ensure we have all required fields with proper types
      const aiPreferences: AIPreferences = {
        rate: typeof preferences?.rate === 'string' ? preferences.rate : defaultPreferences.rate,
        type: typeof preferences?.type === 'string' ? preferences.type : defaultPreferences.type,
        instructions: typeof preferences?.instructions === 'string' ? preferences.instructions : defaultPreferences.instructions
      };

      return {
        ai_preferences: aiPreferences,
        ai_instructions: supabaseData.ai_instructions || ""
      } as ContractorSettings;
    },
  });


  const updateSettings = useMutation({
    mutationFn: async (formData: ContractorSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Convert AIPreferences to a plain object that matches Json type
      const aiPreferencesJson: { [key: string]: string } = {
        rate: formData.ai_preferences.rate,
        type: formData.ai_preferences.type,
        instructions: formData.ai_preferences.instructions
      };

      const contractor = await supabase
            .from("contractors")
            .select("id")
            .eq("user_id", user.id)
            .single();

      const { error } = await supabase
        .from("contractor_settings")
        .update({
          ai_preferences: aiPreferencesJson as Json,
          ai_instructions: formData.ai_preferences.instructions
        })
        .eq("id", contractor.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your AI preferences have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

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
