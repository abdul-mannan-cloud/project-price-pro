import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { ServiceCategoriesSettings } from "@/components/settings/ServiceCategoriesSettings";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { FeaturesSectionWithHoverEffects } from "@/components/ui/feature-section-with-hover-effects";

interface BrandingColors {
  primary: string;
  secondary: string;
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

  const { data: contractor, isLoading: contractorLoading } = useQuery({
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

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

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

  if (contractorLoading) {
    return (
      <div className="min-h-screen bg-secondary">
        <NavBar items={navItems} />
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-muted-foreground">Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  // Get branding colors from contractor data with type assertion
  const brandingColors = (contractor?.branding_colors as BrandingColors) || {
    primary: "#6366F1",
    secondary: "#4F46E5"
  };

  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </div>
        
        <FeaturesSectionWithHoverEffects setActiveDialog={setActiveDialog} />

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
            <div>
              <label className="text-sm font-medium">Minimum Project Cost ($)</label>
              <Input
                name="minimumProjectCost"
                type="number"
                defaultValue={contractor?.contractor_settings?.minimum_project_cost}
              />
              <p className="text-sm text-muted-foreground mt-1">
                The minimum cost you're willing to take on for any project
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Markup Percentage (%)</label>
              <Input
                name="markupPercentage"
                type="number"
                defaultValue={contractor?.contractor_settings?.markup_percentage}
              />
              <p className="text-sm text-muted-foreground mt-1">
                This markup is applied in the background and is not visible to customers. 
                It helps cover overhead costs and maintain profit margins.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Tax Rate (%)</label>
              <Input
                name="taxRate"
                type="number"
                defaultValue={contractor?.contractor_settings?.tax_rate}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Local tax rate applied to estimates
              </p>
            </div>
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
          <AIRateForm
            rates={(contractor?.contractor_settings?.ai_preferences as any)?.rates || []}
            onSave={(rates) => {
              updateSettings.mutate({
                aiPreferences: {
                  rates
                }
              });
            }}
          />
        </SettingsDialog>

        {/* Service Categories Dialog */}
        <SettingsDialog
          title="Service Categories"
          isOpen={activeDialog === "categories"}
          onClose={() => setActiveDialog(null)}
        >
          <ServiceCategoriesSettings />
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

        {/* Feedback Dialog */}
        <SettingsDialog
          title="Feedback"
          isOpen={activeDialog === "feedback"}
          onClose={() => setActiveDialog(null)}
        >
          <div className="space-y-4">
            <p className="text-muted-foreground">
              We value your feedback! Please share your thoughts, suggestions, or report any issues you've encountered.
            </p>
            <form className="space-y-4">
              <textarea
                className="w-full h-32 p-3 rounded-lg border border-input bg-background"
                placeholder="Your feedback..."
              />
              <Button type="submit">Submit Feedback</Button>
            </form>
          </div>
        </SettingsDialog>

        {/* FAQ Dialog */}
        <SettingsDialog
          title="Frequently Asked Questions"
          isOpen={activeDialog === "faq"}
          onClose={() => setActiveDialog(null)}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-medium">How do I update my business information?</h3>
              <p className="text-muted-foreground">
                Click on the "Business Information" card to update your business details, including name, contact information, and address.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How do I customize my brand colors?</h3>
              <p className="text-muted-foreground">
                Navigate to the "Branding" section where you can select your primary and secondary brand colors using our color picker.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">How do webhook notifications work?</h3>
              <p className="text-muted-foreground">
                Webhooks allow you to receive real-time notifications when new leads are created. Configure your webhook endpoints in the "Webhooks" section.
              </p>
            </div>
          </div>
        </SettingsDialog>
      </div>
    </div>
  );
};

export default Settings;
