import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { ServiceCategoriesSettings } from "@/components/settings/ServiceCategoriesSettings";
import { AIInstructionsForm } from "@/components/settings/AIInstructionsForm";
import { TeammateSettings } from "@/components/settings/TeammateSettings";
import { SubscriptionSettings } from "@/components/settings/SubscriptionSettings";
import { LogoUpload } from "@/components/settings/LogoUpload";
import { BrandingSettings } from "@/components/settings/BrandingSettings";
import { TranslationSettings } from "@/components/settings/TranslationSettings";
import { AdminSettings } from "@/components/settings/AdminSettings";
import { SettingsMenuItem } from "@/components/settings/SettingsMenuItem";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandingColors } from "@/types/settings";
import { 
  Building2,
  Users,
  CreditCard,
  Palette,
  Calculator,
  Bot,
  Grid,
  Webhook,
  Globe2,
  ShieldAlert,
  LogOut,
  LayoutDashboard,
  Users2,
  Settings as SettingsIcon
} from "lucide-react";
import { AIRateForm } from "@/components/settings/AIRateForm";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("business");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
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

  const { data: aiRates, isLoading: isLoadingRates } = useQuery({
    queryKey: ['aiRates'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from('ai_rates')
        .select('*')
        .eq('contractor_id', user.id);

      if (error) throw error;
    
    // Transform data to match AIRate interface
    return data.map(rate => ({
      title: rate.title,
      description: rate.description, // Include description property
      rate: rate.rate,
      unit: rate.unit,
      type: rate.type,
      instructions: rate.instructions || ""
    }));
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
        })
        .eq("id", user.id);

      if (contractorError) throw contractorError;

      const { error: settingsError } = await supabase
        .from("contractor_settings")
        .update({
          minimum_project_cost: formData.minimumProjectCost,
          markup_percentage: formData.markupPercentage,
          tax_rate: formData.taxRate,
        })
        .eq("id", user.id);

      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
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

  const saveRates = useMutation({
    mutationFn: async (rates: any[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from('ai_rates')
        .upsert(
          rates.map(rate => ({
            ...rate,
            contractor_id: user.id,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "AI rates saved",
        description: "Your AI rates have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save AI rates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (isMobile) {
      setIsDialogOpen(true);
    }
  };

  const isAdmin = contractor?.contact_email === "cairlbrandon@gmail.com" || 
                 contractor?.contact_email === "brandon@reliablepro.net";

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate("/");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateBrandingColors = async (colors: BrandingColors) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from('contractors')
        .update({ branding_colors: colors })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Branding colors updated",
        description: "Your brand colors have been saved successfully.",
      });
    } catch (error) {
      console.error('Error updating branding colors:', error);
      toast({
        title: "Error",
        description: "Failed to update branding colors. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case "business": return "Business Information";
      case "team": return "Team Members";
      case "subscription": return "Subscription";
      case "branding": return "Branding";
      case "estimate": return "Estimate Settings";
      case "ai": return "AI Preferences";
      case "categories": return "Service Categories";
      case "webhooks": return "Webhooks";
      case "translation": return "Language & Translation";
      case "admin": return "Admin Settings";
      default: return "";
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "business":
        return (
          <div className="space-y-4">
            <LogoUpload currentLogo={contractor?.business_logo_url} />
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              updateSettings.mutate(data);
            }} className="space-y-4">
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
              <Button type="submit" className="w-full" disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        );
      case "team":
        return <TeammateSettings />;
      case "subscription":
        return <SubscriptionSettings />;
      case "branding":
        return (
          <BrandingSettings 
            initialColors={contractor?.branding_colors as BrandingColors || { primary: "#6366F1", secondary: "#4F46E5" }}
            onSave={handleUpdateBrandingColors}
          />
        );
      case "estimate":
        return (
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const data = Object.fromEntries(formData.entries());
            updateSettings.mutate(data);
          }} className="space-y-4">
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
                This markup is applied in the background and is not visible to customers
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
        );
      case "ai":
        return (
          <div className="space-y-6">
            <AIInstructionsForm
              instructions={contractor?.contractor_settings?.ai_instructions ? 
                JSON.parse(contractor.contractor_settings.ai_instructions) : []}
              onSave={(instructions) => {
                updateSettings.mutate({
                  aiInstructions: instructions
                });
              }}
            />
            <AIRateForm
              rates={aiRates || []}
              onSave={(rates) => {
                saveRates.mutate(rates);
              }}
            />
          </div>
        );
      case "categories":
        return <ServiceCategoriesSettings />;
      case "webhooks":
        return <WebhookSettings />;
      case "translation":
        return <TranslationSettings />;
      case "admin":
        return isAdmin ? <AdminSettings /> : null;
      default:
        return null;
    }
  };

  if (contractorLoading || isLoadingRates) {
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

  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        
        <div className="flex gap-6">
          <div className="w-80 space-y-2">
            <SettingsMenuItem
              icon={<Building2 className="h-5 w-5" />}
              title="Business Information"
              description="Update your business details and contact information"
              onClick={() => handleSectionChange("business")}
              isActive={activeSection === "business"}
            />
            <SettingsMenuItem
              icon={<Users className="h-5 w-5" />}
              title="Team Members"
              description="Manage your team members and their access"
              onClick={() => handleSectionChange("team")}
              isActive={activeSection === "team"}
            />
            <SettingsMenuItem
              icon={<CreditCard className="h-5 w-5" />}
              title="Subscription"
              description="Manage your subscription and billing"
              onClick={() => handleSectionChange("subscription")}
              isActive={activeSection === "subscription"}
            />
            <SettingsMenuItem
              icon={<Palette className="h-5 w-5" />}
              title="Branding"
              description="Customize your brand colors and appearance"
              onClick={() => handleSectionChange("branding")}
              isActive={activeSection === "branding"}
            />
            <SettingsMenuItem
              icon={<Calculator className="h-5 w-5" />}
              title="Estimate Settings"
              description="Configure your pricing and cost calculations"
              onClick={() => handleSectionChange("estimate")}
              isActive={activeSection === "estimate"}
            />
            <SettingsMenuItem
              icon={<Bot className="h-5 w-5" />}
              title="AI Preferences"
              description="Configure how AI generates estimates and manages rates"
              onClick={() => handleSectionChange("ai")}
              isActive={activeSection === "ai"}
            />
            <SettingsMenuItem
              icon={<Grid className="h-5 w-5" />}
              title="Service Categories"
              description="Select which services you offer and customize your estimate workflow"
              onClick={() => handleSectionChange("categories")}
              isActive={activeSection === "categories"}
            />
            <SettingsMenuItem
              icon={<Webhook className="h-5 w-5" />}
              title="Webhooks"
              description="Configure external integrations and automation"
              onClick={() => handleSectionChange("webhooks")}
              isActive={activeSection === "webhooks"}
            />
            <SettingsMenuItem
              icon={<Globe2 className="h-5 w-5" />}
              title="Language & Translation"
              description="Configure your language preferences and translations"
              onClick={() => handleSectionChange("translation")}
              isActive={activeSection === "translation"}
            />
            {isAdmin && (
              <SettingsMenuItem
                icon={<ShieldAlert className="h-5 w-5" />}
                title="Admin Settings"
                description="Access administrative functions and data"
                onClick={() => handleSectionChange("admin")}
                isActive={activeSection === "admin"}
              />
            )}
            <SettingsMenuItem
              icon={<LogOut className="h-5 w-5" />}
              title="Log Out"
              description="Sign out of your account"
              onClick={handleLogout}
            />
          </div>
          
          {isMobile ? (
            <SettingsDialog
              title={getSectionTitle()}
              isOpen={isDialogOpen}
              onClose={() => setIsDialogOpen(false)}
            >
              {renderContent()}
            </SettingsDialog>
          ) : (
            <div className="flex-1 bg-background rounded-lg border p-6">
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
