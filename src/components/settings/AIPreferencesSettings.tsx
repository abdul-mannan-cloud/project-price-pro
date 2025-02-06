import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (formData: any) => {
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
    const data = {
      ai_preferences: {
        rate: formData.get("rate"),
        type: formData.get("type"),
        instructions: formData.get("instructions")
      },
      ai_instructions: formData.get("ai_instructions")
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
          defaultValue={settings?.ai_preferences?.rate || "HR"}
          placeholder="e.g., HR for hourly rate"
        />
      </div>

      <div className="space-y-2">
        <Label>Calculation Type</Label>
        <Input
          name="type"
          defaultValue={settings?.ai_preferences?.type || "material_labor"}
          placeholder="e.g., material_labor"
        />
      </div>

      <div className="space-y-2">
        <Label>AI Instructions</Label>
        <Textarea
          name="instructions"
          defaultValue={settings?.ai_preferences?.instructions || ""}
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