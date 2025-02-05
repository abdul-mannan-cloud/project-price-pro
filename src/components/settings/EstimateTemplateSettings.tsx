import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Layout, FileText, Minimize2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const templates = [
  {
    id: "modern",
    name: "Modern",
    icon: <Layout className="h-8 w-8" />,
    preview: ({ contractor }: { contractor: any }) => (
      <div className="space-y-4 p-4">
        <div className="flex items-center space-x-4 mb-6">
          {contractor?.business_logo_url && (
            <img 
              src={contractor.business_logo_url} 
              alt="Business Logo" 
              className="w-16 h-16 object-contain rounded-lg"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold">{contractor?.business_name || 'Sample Company'}</h3>
            <p className="text-sm text-muted-foreground">{contractor?.contact_email}</p>
            <p className="text-sm text-muted-foreground">{contractor?.contact_phone}</p>
            <p className="text-sm text-muted-foreground">{contractor?.business_address}</p>
          </div>
        </div>
        <div className="bg-primary-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Project Estimate</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between p-2 bg-secondary rounded">
            <span>Labor Cost</span>
            <span>$2,500</span>
          </div>
          <div className="flex justify-between p-2 bg-secondary rounded">
            <span>Materials</span>
            <span>$1,500</span>
          </div>
        </div>
        <div className="mt-4 p-4 border-t">
          <div className="mt-4">
            <p className="text-sm">Digital Signature Area</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: "classic",
    name: "Classic",
    icon: <FileText className="h-8 w-8" />,
    preview: ({ contractor }: { contractor: any }) => (
      <div className="space-y-4 p-4 border rounded">
        <div className="border-b pb-4">
          <div className="flex items-center space-x-4 mb-4">
            {contractor?.business_logo_url && (
              <img 
                src={contractor.business_logo_url} 
                alt="Business Logo" 
                className="w-16 h-16 object-contain rounded-lg"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold">{contractor?.business_name || 'Sample Company'}</h3>
              <p className="text-sm text-muted-foreground">{contractor?.contact_email}</p>
              <p className="text-sm text-muted-foreground">{contractor?.contact_phone}</p>
              <p className="text-sm text-muted-foreground">{contractor?.business_address}</p>
            </div>
          </div>
        </div>
        <table className="w-full">
          <tbody>
            <tr className="border-b">
              <td className="py-2">Labor Cost</td>
              <td className="py-2 text-right">$2,500</td>
            </tr>
            <tr className="border-b">
              <td className="py-2">Materials</td>
              <td className="py-2 text-right">$1,500</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  },
  {
    id: "minimal",
    name: "Minimal",
    icon: <Minimize2 className="h-8 w-8" />,
    preview: ({ contractor }: { contractor: any }) => (
      <div className="space-y-4 p-4">
        <div className="flex items-center space-x-4 mb-4">
          {contractor?.business_logo_url && (
            <img 
              src={contractor.business_logo_url} 
              alt="Business Logo" 
              className="w-16 h-16 object-contain rounded-lg"
            />
          )}
          <div>
            <h3 className="text-lg font-semibold">{contractor?.business_name || 'Sample Company'}</h3>
            <p className="text-sm text-muted-foreground">{contractor?.contact_email}</p>
            <p className="text-sm text-muted-foreground">{contractor?.contact_phone}</p>
            <p className="text-sm text-muted-foreground">{contractor?.business_address}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Project Estimate</h3>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Labor Cost</span>
            <span>$2,500</span>
          </div>
          <div className="flex justify-between">
            <span>Materials</span>
            <span>$1,500</span>
          </div>
        </div>
      </div>
    )
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
        .select("estimate_template_style, estimate_signature_enabled, estimate_client_message, estimate_footer_text")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: contractor } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from("contractor_settings")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor_settings"] });
      toast({
        title: "Settings updated",
        description: "Your estimate settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="p-6">
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-medium">Estimate Template</h3>
        </div>

        <RadioGroup
          value={settings?.estimate_template_style || "modern"}
          onValueChange={(value) => updateSettings.mutate({ estimate_template_style: value })}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {templates.map((template) => (
            <div key={template.id} className="relative flex flex-col space-y-2">
              <Label
                className={`flex flex-col items-center justify-between rounded-lg border-2 p-6 hover:bg-accent cursor-pointer transition-all ${
                  settings?.estimate_template_style === template.id
                    ? "border-primary bg-primary"
                    : "border-muted"
                }`}
              >
                <RadioGroupItem
                  value={template.id}
                  id={template.id}
                  className="sr-only"
                />
                <div className="flex flex-col items-center text-center">
                  <div className={`mb-2 p-2 rounded-full ${
                    settings?.estimate_template_style === template.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {template.icon}
                  </div>
                  <div className={settings?.estimate_template_style === template.id ? "text-primary-foreground" : ""}>
                    {template.name}
                  </div>
                </div>
              </Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>{template.name} Template Preview</DialogTitle>
                  </DialogHeader>
                  {template.preview({ contractor })}
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </RadioGroup>

        <div className="space-y-6 pt-6 border-t">
          <div>
            <h3 className="text-lg font-medium mb-4">Additional Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Digital Signature</Label>
                </div>
                <Switch
                  checked={settings?.estimate_signature_enabled}
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
    </Card>
  );
};