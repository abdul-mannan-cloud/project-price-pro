import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Users, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { WebhookSettings } from "@/components/settings/WebhookSettings";
import { ServiceCategoriesSettings } from "@/components/settings/ServiceCategoriesSettings";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeedbackForm } from "@/components/settings/FeedbackForm";
import { FAQ } from "@/components/settings/FAQ";
import { FeaturesSectionWithHoverEffects } from "@/components/ui/feature-section-with-hover-effects";

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

  const updateContractorMutation = useMutation({
    mutationFn: async (formData: any) => {
      const { error } = await supabase
        .from("contractors")
        .update(formData)
        .eq("id", contractor?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Settings updated",
        description: "Your settings have been saved successfully.",
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

  const handleSave = (formData: any) => {
    updateContractorMutation.mutate(formData);
  };

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

        {/* Settings Dialogs */}
        <SettingsDialog
          title="Business Information"
          isOpen={activeDialog === "business information"}
          onClose={() => setActiveDialog(null)}
        >
          <form className="space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSave(Object.fromEntries(formData));
          }}>
            <Input
              label="Business Name"
              name="business_name"
              defaultValue={contractor?.business_name}
              required
            />
            <Input
              label="Contact Email"
              name="contact_email"
              type="email"
              defaultValue={contractor?.contact_email}
              required
            />
            <Input
              label="Contact Phone"
              name="contact_phone"
              type="tel"
              defaultValue={contractor?.contact_phone}
            />
            <Input
              label="Business Address"
              name="business_address"
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
              name="license_number"
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
            onSave={handleSave}
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