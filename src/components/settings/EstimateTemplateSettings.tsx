import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const templates = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean and contemporary design with distinct table borders and subtle shadows"
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional layout with serif fonts and clear table structure"
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Streamlined design with crisp lines and essential information"
  },
  {
    id: "bold",
    name: "Bold",
    description: "High-contrast dark theme with gradient accents and strong typography"
  },
  {
    id: "excel",
    name: "Excel",
    description: "Clean spreadsheet-like design with alternating row colors and compact layout"
  }
];

export const EstimateTemplateSettings = () => {
  const { contractorId } = useParams();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["contractor-settings", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", contractorId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!contractorId
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const { error } = await supabase
        .from("contractor_settings")
        .update(updates)
        .eq("id", contractorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor-settings"] });
      toast({
        title: "Settings updated",
        description: "Your estimate template settings have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Template Style</h3>
        <RadioGroup
          value={settings?.estimate_template_style || "modern"}
          onValueChange={(value) => 
            updateSettings.mutate({ estimate_template_style: value })
          }
          className="grid grid-cols-1 gap-4"
        >
          {templates.map((template) => (
            <div key={template.id} className="space-y-2">
              <Label
                htmlFor={template.id}
                className="flex items-start space-x-3 space-y-0 cursor-pointer"
              >
                <RadioGroupItem value={template.id} id={template.id} />
                <div className="flex-1">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {template.description}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Additional Options</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="signature" className="flex-1">
                Enable Signature Section
                <span className="block text-sm text-muted-foreground">
                  Add a signature section at the bottom of estimates
                </span>
              </Label>
              <Switch
                id="signature"
                checked={settings?.estimate_signature_enabled || false}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({ estimate_signature_enabled: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Client Message</Label>
              <Textarea
                placeholder="Enter a message to display on all estimates..."
                value={settings?.estimate_client_message || ""}
                onChange={(e) => 
                  updateSettings.mutate({ estimate_client_message: e.target.value })
                }
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Footer Text</Label>
              <Textarea
                placeholder="Enter footer text (terms, conditions, etc.)..."
                value={settings?.estimate_footer_text || ""}
                onChange={(e) => 
                  updateSettings.mutate({ estimate_footer_text: e.target.value })
                }
                className="min-h-[100px]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
