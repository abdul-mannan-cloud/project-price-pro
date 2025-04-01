import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {Input} from "@/components/ui/input.tsx";
import Spinner from "../ui/spinner";

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

export const EstimateTemplateSettings = ({contractorId}) => {
  const queryClient = useQueryClient();
  const [clientMessage, setClientMessage] = useState("");
  const [footerText, setFooterText] = useState("");
  const [hasClientMessageChanges, setHasClientMessageChanges] = useState(false);
  const [hasFooterTextChanges, setHasFooterTextChanges] = useState(false);

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


  useEffect(() => {
    if (settings) {
      setClientMessage(settings.estimate_client_message || "");
      setFooterText(settings.estimate_footer_text || "");
    }
  }, [settings]);

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
      setHasClientMessageChanges(false);
      setHasFooterTextChanges(false);
    },
    onError: (error) => {
      console.log('Error updating settings', error)
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-full min-w-full flex items-center justify-center">
        {/* <div className="text-lg">Loading...</div> */}
        <Spinner />
      </div>
    )
  }

  const handleClientMessageChange = (value: string) => {
    setClientMessage(value);
    setHasClientMessageChanges(value !== settings?.estimate_client_message);
  };

  const handleFooterTextChange = (value: string) => {
    setFooterText(value);
    setHasFooterTextChanges(value !== settings?.estimate_footer_text);
  };

  const saveClientMessage = () => {
    updateSettings.mutate({ estimate_client_message: clientMessage });
  };

  const saveFooterText = () => {
    updateSettings.mutate({ estimate_footer_text: footerText });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Estimate Configuration</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Configure your pricing settings, including minimum project costs, markup percentages, and tax rates.
        </p>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        updateSettings.mutate(data);
      }} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Minimum Project Cost ($)</label>
          <Input
              name="minimum_project_cost"
              type="number"
              defaultValue={settings.minimum_project_cost}
          />
          <p className="text-sm text-muted-foreground mt-1">
            The minimum cost you're willing to take on for any project
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Markup Percentage (%)</label>
          <Input
              name="markup_percentage"
              type="number"
              defaultValue={settings?.markup_percentage}
          />
          <p className="text-sm text-muted-foreground mt-1">
            This markup is automatically applied to all AI-generated estimates
          </p>
        </div>

        <div>
          <label className="text-sm font-medium">Tax Rate (%)</label>
          <Input
              name="tax_rate"
              type="number"
              defaultValue={settings?.tax_rate}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Local tax rate automatically applied to all estimates
          </p>
        </div>
        <Button type="submit" disabled={updateSettings.isPending}>
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
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

            <div className="flex items-center justify-between">
              <Label htmlFor="subtotals" className="flex-1">
                Show Subgroup Totals
                <span className="block text-sm text-muted-foreground">
                  Display subtotals for each group and subgroup
                </span>
              </Label>
              <Switch
                id="subtotals"
                checked={!settings?.estimate_hide_subtotals}
                onCheckedChange={(checked) =>
                  updateSettings.mutate({ estimate_hide_subtotals: !checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Client Message</Label>
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter a message to display on all estimates..."
                  value={clientMessage}
                  onChange={(e) => handleClientMessageChange(e.target.value)}
                  className="min-h-[100px]"
                />
                {hasClientMessageChanges && (
                  <Button 
                    onClick={saveClientMessage}
                    disabled={updateSettings.isPending}
                    size="sm"
                  >
                    Save Message
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Footer Text</Label>
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter footer text (terms, conditions, etc.)..."
                  value={footerText}
                  onChange={(e) => handleFooterTextChange(e.target.value)}
                  className="min-h-[100px]"
                />
                {hasFooterTextChanges && (
                  <Button 
                    onClick={saveFooterText}
                    disabled={updateSettings.isPending}
                    size="sm"
                  >
                    Save Footer
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};