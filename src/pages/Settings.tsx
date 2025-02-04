import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Users, LayoutDashboard, LogOut, MessageSquare, HelpCircle } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { ServiceCategoriesSettings } from "@/components/settings/ServiceCategoriesSettings";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeedbackForm } from "@/components/settings/FeedbackForm";
import { FAQ } from "@/components/settings/FAQ";

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

  const features = [
    {
      title: "Preview Estimator",
      description: "Test and preview how your estimator looks to clients",
      icon: <LayoutDashboard className="h-6 w-6" />,
      onClick: () => navigate("/estimate"),
    },
    {
      title: "Business Information",
      description: "Update your business details and branding",
      icon: <SettingsIcon className="h-6 w-6" />,
      onClick: () => setActiveDialog("business information"),
    },
    {
      title: "Service Categories",
      description: "Manage the services you offer",
      icon: <Users className="h-6 w-6" />,
      onClick: () => setActiveDialog("service categories"),
    },
    {
      title: "AI Preferences",
      description: "Customize AI behavior and responses",
      icon: <SettingsIcon className="h-6 w-6" />,
      onClick: () => setActiveDialog("ai preferences"),
    },
    {
      title: "Send Feedback",
      description: "Share your thoughts and suggestions",
      icon: <MessageSquare className="h-6 w-6" />,
      onClick: () => setActiveDialog("feedback"),
    },
    {
      title: "FAQ",
      description: "Find answers to common questions",
      icon: <HelpCircle className="h-6 w-6" />,
      onClick: () => setActiveDialog("faq"),
    },
  ];

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <button
              key={feature.title}
              onClick={feature.onClick}
              className="p-6 bg-background rounded-lg border border-input hover:border-accent transition-colors text-left"
            >
              <div className="flex items-center gap-4 mb-4">
                {feature.icon}
                <h3 className="font-medium">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </button>
          ))}
        </div>

        {/* Settings Dialogs */}
        <SettingsDialog
          title="Business Information"
          isOpen={activeDialog === "business information"}
          onClose={() => setActiveDialog(null)}
        >
          <form className="space-y-4">
            <Input
              label="Business Name"
              defaultValue={contractor?.business_name}
              required
            />
            <Input
              label="Contact Email"
              type="email"
              defaultValue={contractor?.contact_email}
              required
            />
            <Input
              label="Contact Phone"
              type="tel"
              defaultValue={contractor?.contact_phone}
            />
            <Input
              label="Business Address"
              defaultValue={contractor?.business_address}
            />
            <Input
              label="Website"
              type="url"
              defaultValue={contractor?.website}
            />
            <Input
              label="License Number"
              defaultValue={contractor?.license_number}
            />
            <Button type="submit">
              Save Changes
            </Button>
          </form>
        </SettingsDialog>

        <SettingsDialog
          title="Service Categories"
          isOpen={activeDialog === "service categories"}
          onClose={() => setActiveDialog(null)}
        >
          <ServiceCategoriesSettings />
        </SettingsDialog>

        <SettingsDialog
          title="AI Preferences"
          isOpen={activeDialog === "ai preferences"}
          onClose={() => setActiveDialog(null)}
        >
          <AIRateForm
            rates={(contractor?.contractor_settings?.ai_preferences as any)?.rates || []}
            onSave={(rates) => {
              // Handle saving AI rates
            }}
          />
        </SettingsDialog>

        <SettingsDialog
          title="Send Feedback"
          isOpen={activeDialog === "feedback"}
          onClose={() => setActiveDialog(null)}
        >
          <FeedbackForm />
        </SettingsDialog>

        <SettingsDialog
          title="Frequently Asked Questions"
          isOpen={activeDialog === "faq"}
          onClose={() => setActiveDialog(null)}
        >
          <FAQ />
        </SettingsDialog>
      </div>
    </div>
  );
};

export default Settings;