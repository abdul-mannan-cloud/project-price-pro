import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Layout, FileText, Minimize2 } from "lucide-react";

const templates = [
  {
    id: "modern",
    name: "Modern",
    description: "A clean, contemporary design with a focus on readability and visual hierarchy.",
    icon: <Layout className="h-8 w-8" />,
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional estimate layout with a professional and timeless appearance.",
    icon: <FileText className="h-8 w-8" />,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simplified design focusing on essential information with minimal styling.",
    icon: <Minimize2 className="h-8 w-8" />,
  },
];

export const EstimateTemplateSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["contractor_settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("estimate_template_style")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (template: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("contractor_settings")
        .update({ estimate_template_style: template })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor_settings"] });
      toast({
        title: "Template updated",
        description: "Your estimate template style has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update template style. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Estimate Template</h3>
          <p className="text-sm text-muted-foreground">
            Choose how your estimates will look when downloaded as PDF.
          </p>
        </div>

        <RadioGroup
          value={settings?.estimate_template_style || "modern"}
          onValueChange={(value) => updateTemplate.mutate(value)}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {templates.map((template) => (
            <Label
              key={template.id}
              className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-accent cursor-pointer ${
                settings?.estimate_template_style === template.id
                  ? "border-primary bg-accent"
                  : "border-muted"
              }`}
            >
              <RadioGroupItem
                value={template.id}
                id={template.id}
                className="sr-only"
              />
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="mb-2 p-2 rounded-full bg-primary/10 text-primary">
                  {template.icon}
                </div>
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-muted-foreground">
                  {template.description}
                </div>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
};