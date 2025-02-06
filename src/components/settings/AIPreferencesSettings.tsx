import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AIPreferences {
  rate: string;
  type: string;
  instructions: string;
}

interface ContractorSettings {
  ai_preferences: AIPreferences;
  ai_instructions: string;
}

export const AIPreferencesSettings = () => {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as ContractorSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (formData: ContractorSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("contractor_settings")
        .update({
          ai_preferences: formData.ai_preferences,
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
        rate: formData.get("rate") as string || "HR",
        type: formData.get("type") as string || "material_labor",
        instructions: formData.get("instructions") as string || ""
      },
      ai_instructions: formData.get("ai_instructions") as string || ""
    };
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const defaultPreferences = settings?.ai_preferences || {
    rate: "HR",
    type: "material_labor",
    instructions: ""
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label>Rate Type</Label>
        <Input
          name="rate"
          defaultValue={defaultPreferences.rate}
          placeholder="e.g., HR for hourly rate"
        />
      </div>

      <div className="space-y-2">
        <Label>Calculation Type</Label>
        <Input
          name="type"
          defaultValue={defaultPreferences.type}
          placeholder="e.g., material_labor"
        />
      </div>

      <div className="space-y-2">
        <Label>AI Instructions</Label>
        <Textarea
          name="instructions"
          defaultValue={defaultPreferences.instructions}
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