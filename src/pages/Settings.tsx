import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { LogOut, LayoutDashboard as LayoutDashboardIcon, Users as Users2, Settings as SettingsIcon } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { ServiceCategoriesSettings } from "@/components/settings/ServiceCategoriesSettings";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { AIInstructionsForm } from "@/components/settings/AIInstructionsForm";
import { TeammateSettings } from "@/components/settings/TeammateSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { LogoUpload } from "@/components/settings/LogoUpload";

interface AIInstruction {
  title: string;
  description: string;
  instructions: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
    { name: "Leads", url: "/leads", icon: Users2 },
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
          ai_instructions: JSON.stringify(formData.aiInstructions || [])
        })
        .eq("id", user.id);

      if (settingsError) throw settingsError;

      document.documentElement.style.setProperty('--primary', formData.primaryColor);
      document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');
      document.documentElement.style.setProperty('--secondary', formData.secondaryColor);
      document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');
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

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const data = Object.fromEntries(formData.entries());
    updateSettings.mutate(data);
  };

  const handleSave = (data: any) => {
    updateSettings.mutate(data);
  };

  const parsedInstructions = (): AIInstruction[] => {
    try {
      if (!contractor?.contractor_settings?.ai_instructions) return [];
      
      // If it's already an array, validate its structure
      if (Array.isArray(contractor.contractor_settings.ai_instructions)) {
        return contractor.contractor_settings.ai_instructions.map(instruction => ({
          title: String(instruction.title || ''),
          description: String(instruction.description || ''),
          instructions: String(instruction.instructions || '')
        }));
      }
      
      // If it's a string, try to parse it
      if (typeof contractor.contractor_settings.ai_instructions === 'string') {
        const parsed = JSON.parse(contractor.contractor_settings.ai_instructions);
        if (Array.isArray(parsed)) {
          return parsed.map(instruction => ({
            title: String(instruction.title || ''),
            description: String(instruction.description || ''),
            instructions: String(instruction.instructions || '')
          }));
        }
      }
      
      return [];
    } catch (e) {
      console.error('Error parsing AI instructions:', e);
      return [];
    }
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

  const brandingColors = contractor?.branding_colors 
    ? (contractor.branding_colors as unknown as { primary: string; secondary: string }) 
    : {
        primary: "#6366F1",
        secondary: "#4F46E5"
      };

  // ... keep existing code (the rest of the JSX for settings dialogs)

  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        
        <div className="grid gap-6">
          <SettingsDialog
            title="Business Information"
            description="Update your business details and contact information"
            isOpen={activeDialog === "business"}
            onClose={() => setActiveDialog(null)}
          >
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <LogoUpload currentLogo={contractor?.business_logo_url} />
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

          <SettingsDialog
            title="Team Members"
            description="Manage your team members and their access"
            isOpen={activeDialog === "team"}
            onClose={() => setActiveDialog(null)}
          >
            <TeammateSettings />
          </SettingsDialog>

          <SettingsDialog
            title="Subscription"
            description="Manage your subscription and billing"
            isOpen={activeDialog === "subscription"}
            onClose={() => setActiveDialog(null)}
          >
            <SubscriptionSettings />
          </SettingsDialog>

          <SettingsDialog
            title="Branding"
            description="Customize your brand colors and appearance"
            isOpen={activeDialog === "branding"}
            onClose={() => setActiveDialog(null)}
          >
            <form onSubmit={handleFormSubmit} className="space-y-6">
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

          <SettingsDialog
            title="Estimate Settings"
            description="Configure your pricing and cost calculations"
            isOpen={activeDialog === "estimate"}
            onClose={() => setActiveDialog(null)}
          >
            <form onSubmit={handleFormSubmit} className="space-y-4">
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

          <SettingsDialog
            title="AI Preferences"
            description="Configure how AI generates estimates and manages rates"
            isOpen={activeDialog === "ai"}
            onClose={() => setActiveDialog(null)}
          >
            <div className="space-y-6">
              <AIInstructionsForm
                instructions={parsedInstructions()}
                onSave={(instructions) => {
                  updateSettings.mutate({
                    aiInstructions: instructions
                  });
                }}
              />
              
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
            </div>
          </SettingsDialog>

          <SettingsDialog
            title="Service Categories"
            description="Select which services you offer and customize your estimate workflow"
            isOpen={activeDialog === "categories"}
            onClose={() => setActiveDialog(null)}
          >
            <ServiceCategoriesSettings />
          </SettingsDialog>

          <SettingsDialog
            title="Webhooks"
            description="Configure external integrations and automation"
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
          
          <SettingsDialog
            title="Log Out"
            description="Sign out of your account"
            isOpen={activeDialog === "logout"}
            onClose={() => setActiveDialog(null)}
          >
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Are you sure you want to log out? You will need to sign in again to access your account.
              </p>
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="w-full"
              >
                Log Out
              </Button>
            </div>
          </SettingsDialog>
        </div>
      </div>
    </div>
  );
};

export default Settings;
