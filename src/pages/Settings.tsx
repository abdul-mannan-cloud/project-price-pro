import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { LayoutDashboard, Users, Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleSave = async () => {
    // Implementation for saving settings
    toast({
      title: "Settings saved",
      description: "Your settings have been updated successfully.",
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Business Information</h2>
            <div className="space-y-4">
              <Input
                label="Business Name"
                defaultValue={contractor?.business_name}
                name="businessName"
              />
              <Input
                label="Contact Email"
                defaultValue={contractor?.contact_email}
                name="contactEmail"
                type="email"
              />
              <Input
                label="Contact Phone"
                defaultValue={contractor?.contact_phone}
                name="contactPhone"
                type="tel"
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Branding</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Primary Color
                </label>
                <ColorPicker
                  color={contractor?.branding_colors?.primary || "#6366F1"}
                  onChange={() => {}}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Secondary Color
                </label>
                <ColorPicker
                  color={contractor?.branding_colors?.secondary || "#4F46E5"}
                  onChange={() => {}}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4">Business Settings</h2>
            <div className="space-y-4">
              <Input
                label="Minimum Project Cost ($)"
                defaultValue={contractor?.contractor_settings?.minimum_project_cost}
                name="minimumProjectCost"
                type="number"
              />
              <Input
                label="Markup Percentage (%)"
                defaultValue={contractor?.contractor_settings?.markup_percentage}
                name="markupPercentage"
                type="number"
              />
              <Input
                label="Tax Rate (%)"
                defaultValue={contractor?.contractor_settings?.tax_rate}
                name="taxRate"
                type="number"
              />
            </div>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;