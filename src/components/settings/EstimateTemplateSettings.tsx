import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Layout, FileText, Minimize2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const templates = [
  {
    id: "modern",
    name: "Modern",
    description: "A clean, contemporary design with a focus on readability and visual hierarchy.",
    icon: <Layout className="h-8 w-8" />,
    preview: (
      <div className="space-y-4 p-4">
        <div className="bg-primary-100 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Project Estimate</h3>
          <p className="text-sm text-muted-foreground">Modern Template Preview</p>
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
      </div>
    )
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional estimate layout with a professional and timeless appearance.",
    icon: <FileText className="h-8 w-8" />,
    preview: (
      <div className="space-y-4 p-4 border rounded">
        <div className="border-b pb-4">
          <h3 className="text-lg font-semibold">Project Estimate</h3>
          <p className="text-sm text-muted-foreground">Classic Template Preview</p>
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
    description: "Simplified design focusing on essential information with minimal styling.",
    icon: <Minimize2 className="h-8 w-8" />,
    preview: (
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-lg font-semibold">Project Estimate</h3>
          <p className="text-sm text-muted-foreground">Minimal Template Preview</p>
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
            <div key={template.id} className="relative">
              <Label
                className={`flex flex-col items-center justify-between rounded-lg border-2 p-4 hover:bg-accent cursor-pointer transition-all ${
                  settings?.estimate_template_style === template.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted"
                }`}
              >
                <RadioGroupItem
                  value={template.id}
                  id={template.id}
                  className="sr-only"
                />
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className={`mb-2 p-2 rounded-full ${
                    settings?.estimate_template_style === template.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {template.icon}
                  </div>
                  <div className="font-medium">{template.name}</div>
                  <div className={`text-sm ${
                    settings?.estimate_template_style === template.id
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}>
                    {template.description}
                  </div>
                </div>
              </Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="absolute bottom-2 right-2"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{template.name} Template Preview</DialogTitle>
                  </DialogHeader>
                  {template.preview}
                </DialogContent>
              </Dialog>
            </div>
          ))}
        </RadioGroup>
      </div>
    </Card>
  );
};