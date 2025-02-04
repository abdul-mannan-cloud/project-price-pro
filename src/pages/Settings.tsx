import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Settings as SettingsIcon, Users, LayoutDashboard, Building2, Palette, Calculator, Webhook, Bot } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { SettingsMenuItem } from "@/components/settings/SettingsMenuItem";
import { WebhookSettings } from "@/components/settings/WebhookSettings";

interface AIPreferences {
  rate: string;
  type: string;
  instructions: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: SettingsIcon }
  ];

  // Fetch contractor data
  const { data: contractor, isLoading } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_settings(*)")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (formData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error: contractorError } = await supabase
        .from("contractors")
        .update({
          business_name: formData.businessName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          business_address: formData.businessAddress,
          website: formData.website,
          license_number: formData.licenseNumber,
          branding_colors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor
          }
        })
        .eq("id", user.id);

      if (contractorError) throw contractorError;

      const { error: settingsError } = await supabase
        .from("contractor_settings")
        .update({
          minimum_project_cost: formData.minimumProjectCost,
          markup_percentage: formData.markupPercentage,
          tax_rate: formData.taxRate,
          ai_preferences: {
            rate: formData.aiRate,
            type: formData.aiType,
            instructions: formData.aiInstructions
          }
        })
        .eq("id", user.id);

      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
      setActiveDialog(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    updateSettings.mutate({
      businessName: formData.get("businessName"),
      contactEmail: formData.get("contactEmail"),
      contactPhone: formData.get("contactPhone"),
      businessAddress: formData.get("businessAddress"),
      website: formData.get("website"),
      licenseNumber: formData.get("licenseNumber"),
      primaryColor: formData.get("primaryColor"),
      secondaryColor: formData.get("secondaryColor"),
      minimumProjectCost: formData.get("minimumProjectCost"),
      markupPercentage: formData.get("markupPercentage"),
      taxRate: formData.get("taxRate"),
      aiRate: formData.get("aiRate"),
      aiType: formData.get("aiType"),
      aiInstructions: formData.get("aiInstructions"),
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const defaultColors = {
    primary: "#007AFF",
    secondary: "#F5F5F7"
  };

  const brandingColors = 
    contractor?.branding_colors && 
    typeof contractor.branding_colors === 'object' && 
    !Array.isArray(contractor.branding_colors) && 
    contractor.branding_colors as { [key: string]: any } &&
    'primary' in contractor.branding_colors && 
    'secondary' in contractor.branding_colors
      ? {
          primary: String(contractor.branding_colors.primary),
          secondary: String(contractor.branding_colors.secondary)
        }
      : defaultColors;

  const defaultAIPreferences: AIPreferences = {
    rate: "HR",
    type: "material_labor",
    instructions: ""
  };

  const aiPreferences = contractor?.contractor_settings?.ai_preferences && 
    typeof contractor.contractor_settings.ai_preferences === 'object' && 
    !Array.isArray(contractor.contractor_settings.ai_preferences) &&
    contractor.contractor_settings.ai_preferences as { [key: string]: Json } &&
    'rate' in contractor.contractor_settings.ai_preferences &&
    'type' in contractor.contractor_settings.ai_preferences &&
    'instructions' in contractor.contractor_settings.ai_preferences
      ? {
          rate: String(contractor.contractor_settings.ai_preferences.rate),
          type: String(contractor.contractor_settings.ai_preferences.type),
          instructions: String(contractor.contractor_settings.ai_preferences.instructions)
        }
      : defaultAIPreferences;

  // ... keep existing code (JSX for the settings page)

  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>
        
        <div className="space-y-4">
          <SettingsMenuItem
            icon={<Building2 className="h-5 w-5" />}
            title="Business Information"
            description="Manage your business details and contact information"
            onClick={() => setActiveDialog("business")}
          />

          <SettingsMenuItem
            icon={<Palette className="h-5 w-5" />}
            title="Branding"
            description="Customize your brand colors and appearance"
            onClick={() => setActiveDialog("branding")}
          />

          <SettingsMenuItem
            icon={<Calculator className="h-5 w-5" />}
            title="Estimate Settings"
            description="Configure estimate calculations and pricing"
            onClick={() => setActiveDialog("estimate")}
          />

          <SettingsMenuItem
            icon={<Bot className="h-5 w-5" />}
            title="AI Preferences"
            description="Configure AI settings for estimate generation"
            onClick={() => setActiveDialog("ai")}
          />

          <SettingsMenuItem
            icon={<Webhook className="h-5 w-5" />}
            title="Webhooks"
            description="Manage webhook integrations for lead notifications"
            onClick={() => setActiveDialog("webhooks")}
          />
        </div>

        {/* Business Information Dialog */}
        <SettingsDialog
          title="Business Information"
          isOpen={activeDialog === "business"}
          onClose={() => setActiveDialog(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Business Name"
              name="businessName"
              defaultValue={contractor?.business_name}
              required
            />
            <Input
              label="Contact Email"
              name="contactEmail"
              type="email"
              defaultValue={contractor?.contact_email}
              required
            />
            <Input
              label="Contact Phone"
              name="contactPhone"
              type="tel"
              defaultValue={contractor?.contact_phone}
            />
            <Input
              label="Business Address"
              name="businessAddress"
              defaultValue={contractor?.business_address}
            />
            <Input
              label="Website"
              name="website"
              type="url"
              defaultValue={contractor?.website}
            />
            <Input
              label="License Number"
              name="licenseNumber"
              defaultValue={contractor?.license_number}
            />
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SettingsDialog>

        {/* Branding Dialog */}
        <SettingsDialog
          title="Branding"
          isOpen={activeDialog === "branding"}
          onClose={() => setActiveDialog(null)}
        >
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Primary Color
              </label>
              <ColorPicker
                color={brandingColors.primary}
                onChange={(color) => {
                  document.documentElement.style.setProperty('--primary', color);
                  document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');
                }}
              />
              <input type="hidden" name="primaryColor" value={brandingColors.primary} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Secondary Color
              </label>
              <ColorPicker
                color={brandingColors.secondary}
                onChange={(color) => {
                  document.documentElement.style.setProperty('--secondary', color);
                  document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');
                }}
              />
              <input type="hidden" name="secondaryColor" value={brandingColors.secondary} />
            </div>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SettingsDialog>

        {/* Estimate Settings Dialog */}
        <SettingsDialog
          title="Estimate Settings"
          isOpen={activeDialog === "estimate"}
          onClose={() => setActiveDialog(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Minimum Project Cost ($)"
              name="minimumProjectCost"
              type="number"
              defaultValue={contractor?.contractor_settings?.minimum_project_cost}
            />
            <Input
              label="Markup Percentage (%)"
              name="markupPercentage"
              type="number"
              defaultValue={contractor?.contractor_settings?.markup_percentage}
            />
            <Input
              label="Tax Rate (%)"
              name="taxRate"
              type="number"
              defaultValue={contractor?.contractor_settings?.tax_rate}
            />
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SettingsDialog>

        {/* AI Preferences Dialog */}
        <SettingsDialog
          title="AI Preferences"
          isOpen={activeDialog === "ai"}
          onClose={() => setActiveDialog(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Rate Type</label>
                <select
                  name="aiRate"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  defaultValue={aiPreferences.rate}
                >
                  <option value="HR">Hourly Rate</option>
                  <option value="SF">Square Foot</option>
                  <option value="LF">Linear Foot</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Estimate Type</label>
                <select
                  name="aiType"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  defaultValue={aiPreferences.type}
                >
                  <option value="material_labor">Material & Labor</option>
                  <option value="labor_only">Labor Only</option>
                  <option value="material_only">Material Only</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Additional Instructions</label>
                <textarea
                  name="aiInstructions"
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  rows={4}
                  defaultValue={aiPreferences.instructions}
                  placeholder="Add any specific instructions for AI estimate generation..."
                />
              </div>
            </div>
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </SettingsDialog>

        {/* Webhooks Dialog */}
        <SettingsDialog
          title="Webhooks"
          isOpen={activeDialog === "webhooks"}
          onClose={() => setActiveDialog(null)}
        >
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Webhooks allow you to receive real-time notifications when new leads are created. 
              You can configure external services to receive these notifications and automate your workflow.
            </p>
          </div>
          <WebhookSettings />
        </SettingsDialog>
      </div>
    </div>
  );
};

export default Settings;
