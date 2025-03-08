import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Settings as SettingsIcon,
  Loader2
} from "lucide-react";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { EstimateTemplateSettings } from "@/components/settings/EstimateTemplateSettings";

// Google Maps API key (Note: You should secure this in production)
const GOOGLE_API_KEY = "AIzaSyBuZj-RWOoAc24CaC2h4SY9LvD-WzQPtJs";

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("business");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  // Address suggestion state
  const [businessAddress, setBusinessAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef(null);
  const addressInputRef = useRef(null);

  const navItems = [
    { name: t("Dashboard"), url: "/dashboard", icon: LayoutDashboard },
    { name: t("Leads"), url: "/leads", icon: Users2 },
    { name: t("Settings"), url: "/settings", icon: SettingsIcon }
  ];

  const { data: contractor, isLoading: contractorLoading } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
          .from("contractors")
          .select("*, contractor_settings(*)")
          .eq("user_id", user.id)
          .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: aiInstructions, isLoading: aiInstructionsLoading } = useQuery({
    queryKey: ["aiInstructions"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // First get the contractor ID
      const { data: contractorData, error: contractorError } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      if (contractorError) throw contractorError;

      // Then get the AI instructions using the contractor_id
      const { data, error } = await supabase
          .from("ai_instructions")
          .select("*")
          .eq("contractor_id", contractorData.id);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: aiRates, isLoading: aiRatesLoading } = useQuery({
    queryKey: ["aiRates"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // First get the contractor ID
      const { data: contractorData, error: contractorError } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      if (contractorError) throw contractorError;

      // Then get the AI rates using the contractor_id
      const { data, error } = await supabase
          .from("ai_rates")
          .select("*")
          .eq("contractor_id", contractorData.id);

      if (error) throw error;
      return data || [];
    },
  });

// 2. Add a function to save rates
  const saveRates = async (rates) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get the contractor to access the contractor_id
      const { data: contractorData, error: contractorError } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      if (contractorError) throw contractorError;
      const contractor_id = contractorData.id;

      // For each rate in the array, upsert to the ai_rates table
      const promises = rates.map(async (rate) => {
        if (rate.id) {
          // Update existing rate
          const { error } = await supabase
              .from("ai_rates")
              .update({
                title: rate.title,
                rate: rate.rate,
                unit: rate.unit,
                type: rate.type,
                description: rate.description,
                instructions: rate.instructions,
                updated_at: new Date().toISOString()
              })
              .eq("id", rate.id);

          if (error) {
            console.error("Update rate error:", error);
            throw error;
          }
        } else {
          // Insert new rate
          const { error } = await supabase
              .from("ai_rates")
              .insert({
                contractor_id: contractor_id,
                title: rate.title,
                rate: rate.rate,
                unit: rate.unit,
                type: rate.type,
                description: rate.description || "",
                instructions: rate.instructions || "",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

          if (error) {
            console.error("Insert rate error:", error);
            throw error;
          }
        }
      });

      // Wait for all database operations to complete
      await Promise.all(promises);

      toast({
        title: t("AI rates saved"),
        description: t("Your AI rates have been updated successfully."),
      });
    } catch (error) {
      console.error("Error saving AI rates:", error);
      toast({
        title: t("Error"),
        description: t("Failed to save AI rates. Please try again."),
        variant: "destructive",
      });
    }
  };

  // Set initial business address when contractor data loads
  useEffect(() => {
    if (contractor?.business_address) {
      setBusinessAddress(contractor.business_address);
    }
  }, [contractor]);

  // Handle clicks outside the suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target) &&
          addressInputRef.current && !addressInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch address suggestions
  const getAddressSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingAddress(true);
    try {
      const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${GOOGLE_API_KEY}`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results) {
        const suggestions = data.results.map(result => result.formatted_address);
        setAddressSuggestions(suggestions);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching address suggestions:", error);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Debounce function
  const debounce = (func, delay) => {
    let timeoutId;
    return function(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Create debounced version of getAddressSuggestions
  const debouncedGetSuggestions = useRef(
      debounce(getAddressSuggestions, 500)
  ).current;

  // Handle address input change
  const handleAddressChange = (value) => {
    setBusinessAddress(value);
    debouncedGetSuggestions(value);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    setBusinessAddress(suggestion);
    setShowSuggestions(false);
  };

  const saveInstructions = async (instructions) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Get the contractor to access the contractor_id
      const { data: contractorData, error: contractorError } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      if (contractorError) throw contractorError;
      const contractor_id = contractorData.id;

      // For each instruction in the array, upsert to the ai_instructions table
      const promises = instructions.map(async (instruction) => {
        if (instruction.id) {
          // Update existing instruction
          const { error } = await supabase
              .from("ai_instructions")
              .update({
                title: instruction.title,
                description: instruction.description,
                instructions: instruction.instructions,
                updated_at: new Date().toISOString()
              })
              .eq("id", instruction.id);

          if (error) throw error;
        } else {
          // Insert new instruction
          const { error } = await supabase
              .from("ai_instructions")
              .insert({
                contractor_id: contractor_id,
                title: instruction.title,
                description: instruction.description,
                instructions: instruction.instructions,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

          if (error) throw error;
        }
      });

      // Wait for all database operations to complete
      await Promise.all(promises);

      toast({
        title: t("AI instructions saved"),
        description: t("Your AI instructions have been updated successfully."),
      });
    } catch (error) {
      console.error("Error saving AI instructions:", error);
      toast({
        title: t("Error"),
        description: t("Failed to save AI instructions. Please try again."),
        variant: "destructive",
      });
    }
  };

  const updateSettings = useMutation({
    mutationFn: async (formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error: contractorError } = await supabase
          .from("contractors")
          .update({
            business_name: formData.businessName,
            contact_email: formData.contactEmail,
            contact_phone: formData.contactPhone,
            business_address: formData.businessAddress || businessAddress, // Use state value if not provided in form
            website: formData.website,
            license_number: formData.licenseNumber,
          })
          .eq("user_id", user.id);

      if (contractorError) throw contractorError;

      const contractor = await supabase.from("contractors").select("*").eq("user_id", user.id).single();

      const { error: settingsError } = await supabase
          .from("contractor_settings")
          .update({
            minimum_project_cost: formData.minimumProjectCost,
            markup_percentage: formData.markupPercentage,
            tax_rate: formData.taxRate,
            ai_instructions: formData.aiInstructions,
          })
          .eq("id", contractor.data.id);

      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      toast({
        title: t("Settings saved"),
        description: t("Your settings have been updated successfully."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Error"),
        description: t("Failed to save settings. Please try again."),
        variant: "destructive",
      });
    },
  });

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      navigate("/");
      toast({
        title: t("Logged out successfully"),
        description: t("You have been logged out of your account."),
      });
    } catch (error) {
      toast({
        title: t("Error"),
        description: t("Failed to log out. Please try again."),
        variant: "destructive",
      });
    }
  };

  const handleUpdateBrandingColors = async (colors) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
          .from('contractors')
          .update({ branding_colors: colors })
          .eq('id', user.id);

      if (error) throw error;

      toast({
        title: t("Branding colors updated"),
        description: t("Your brand colors have been saved successfully."),
      });
    } catch (error) {
      console.error('Error updating branding colors:', error);
      toast({
        title: t("Error"),
        description: t("Failed to update branding colors. Please try again."),
        variant: "destructive",
      });
    }
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (isMobile) {
      setIsDialogOpen(true);
    }
  };

  const isAdmin = contractor?.contact_email === "cairlbrandon@gmail.com" ||
      contractor?.contact_email === "brandon@reliablepro.net";

  const handleSubmitBusinessForm = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    // Add business address from state
    data.businessAddress = businessAddress;
    updateSettings.mutate(data);
  };

  if (contractorLoading) {
    return (
        <div className="min-h-screen bg-secondary">
          <NavBar items={navItems} />
          <div className="container mx-auto py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-muted-foreground">{t("Loading settings...")}</div>
            </div>
          </div>
        </div>
    );
  }


  const getSectionTitle = () => {
    switch (activeSection) {
      case "business": return t("Business Information");
      case "team": return t("Team Members");
      case "subscription": return t("Subscription");
      case "branding": return t("Branding");
      case "estimate": return t("Estimate Settings");
      case "ai": return t("AI Preferences");
      case "categories": return t("Service Categories");
      case "webhooks": return t("Webhooks");
      case "translation": return t("Language & Translation");
      case "admin": return t("Admin Settings");
      default: return "";
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "business":
        return (
            <div className="space-y-4">
              <LogoUpload currentLogo={contractor?.business_logo_url} />
              <form onSubmit={handleSubmitBusinessForm} className="space-y-2">
                <Input
                    label={t("Business Name")}
                    name="businessName"
                    defaultValue={contractor?.business_name}
                    required
                />
                <Input
                    label={t("Contact Email")}
                    name="contactEmail"
                    type="email"
                    defaultValue={contractor?.contact_email}
                    required
                />
                <Input
                    label={t("Contact Phone")}
                    name="contactPhone"
                    type="tel"
                    defaultValue={contractor?.contact_phone}
                />

                {/* Address input with autocomplete */}
                <div className="form-group relative">
                  <Input
                      ref={addressInputRef}
                      placeholder={t("Business Address")}
                      value={businessAddress}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      onFocus={() => businessAddress && setShowSuggestions(true)}
                      className="h-12 px-4 pt-3 mt-2"
                  />
                  <label className="absolute top-1 left-2 mt-2 text-xs bg-transparent px-1 text-muted-foreground">
                    {t("Business Address")}
                  </label>

                  {isLoadingAddress && (
                      <div className="absolute right-3 top-3">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                  )}

                  {showSuggestions && addressSuggestions.length > 0 && (
                      <div
                          ref={suggestionRef}
                          className="absolute z-10 -mt-5 w-full bg-background border border-input rounded-md shadow-lg"
                      >
                        <ul className="py-1 max-h-60 overflow-auto">
                          {addressSuggestions.map((suggestion, index) => (
                              <li
                                  key={index}
                                  className="px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                  onClick={() => handleSelectSuggestion(suggestion)}
                              >
                                {suggestion}
                              </li>
                          ))}
                        </ul>
                      </div>
                  )}
                </div>

                <Input
                    label={t("Website")}
                    name="website"
                    type="url"
                    defaultValue={contractor?.website}
                />
                <Input
                    label={t("License Number")}
                    name="licenseNumber"
                    defaultValue={contractor?.license_number}
                />
                <Button type="submit" className="w-full mt-4" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? t("Saving...") : t("Save Changes")}
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
                initialColors={contractor?.branding_colors || { primary: "#6366F1", secondary: "#4F46E5" }}
                onSave={handleUpdateBrandingColors}
            />
        );
      case "estimate":
        return (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">{t("Estimate Configuration")}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {t("Configure your pricing settings, including minimum project costs, markup percentages, and tax rates.")}
                </p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData.entries());
                updateSettings.mutate(data);
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t("Minimum Project Cost ($)")}</label>
                  <Input
                      name="minimumProjectCost"
                      type="number"
                      defaultValue={contractor?.contractor_settings?.minimum_project_cost}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("The minimum cost you're willing to take on for any project")}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">{t("Markup Percentage (%)")}</label>
                  <Input
                      name="markupPercentage"
                      type="number"
                      defaultValue={contractor?.contractor_settings?.markup_percentage}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("This markup is automatically applied to all AI-generated estimates")}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">{t("Tax Rate (%)")}</label>
                  <Input
                      name="taxRate"
                      type="number"
                      defaultValue={contractor?.contractor_settings?.tax_rate}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("Local tax rate automatically applied to all estimates")}
                  </p>
                </div>
                <Button type="submit" disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? t("Saving...") : t("Save Changes")}
                </Button>
              </form>

              <div className="pt-6 border-t">
                <EstimateTemplateSettings />
              </div>
            </div>
        );
      case "ai":
        return (
            <div className="space-y-6">
              {aiInstructionsLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
              ) : (
                  <AIInstructionsForm
                      instructions={aiInstructions}
                      onSave={saveInstructions}
                  />
              )}
              <AIRateForm
                  rates={aiRates}
                  onSave={saveRates}
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

  return (
      <div className="min-h-screen bg-secondary">
        <NavBar items={navItems} />
        <div className="container mx-auto py-8 min-h-[calc(100vh-4rem)]">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">{t("Settings")}</h1>
          </div>

          <div className="flex gap-6">
            <div className="w-80 space-y-2 flex-shrink-0">
              <SettingsMenuItem
                  icon={<Building2 className="h-5 w-5" />}
                  title={t("Business Information")}
                  description={t("Update your business details and contact information")}
                  onClick={() => handleSectionChange("business")}
                  isActive={activeSection === "business"}
              />
              <SettingsMenuItem
                  icon={<Users className="h-5 w-5" />}
                  title={t("Team Members")}
                  description={t("Manage your team members and their access")}
                  onClick={() => handleSectionChange("team")}
                  isActive={activeSection === "team"}
              />
              <SettingsMenuItem
                  icon={<CreditCard className="h-5 w-5" />}
                  title={t("Subscription")}
                  description={t("Manage your subscription and billing")}
                  onClick={() => handleSectionChange("subscription")}
                  isActive={activeSection === "subscription"}
              />
              <SettingsMenuItem
                  icon={<Palette className="h-5 w-5" />}
                  title={t("Branding")}
                  description={t("Customize your brand colors and appearance")}
                  onClick={() => handleSectionChange("branding")}
                  isActive={activeSection === "branding"}
              />
              <SettingsMenuItem
                  icon={<Calculator className="h-5 w-5" />}
                  title={t("Estimate Settings")}
                  description={t("Configure your pricing and cost calculations")}
                  onClick={() => handleSectionChange("estimate")}
                  isActive={activeSection === "estimate"}
              />
              <SettingsMenuItem
                  icon={<Bot className="h-5 w-5" />}
                  title={t("AI Preferences")}
                  description={t("Configure how AI generates estimates and manages rates")}
                  onClick={() => handleSectionChange("ai")}
                  isActive={activeSection === "ai"}
              />
              <SettingsMenuItem
                  icon={<Grid className="h-5 w-5" />}
                  title={t("Service Categories")}
                  description={t("Select which services you offer and customize your estimate workflow")}
                  onClick={() => handleSectionChange("categories")}
                  isActive={activeSection === "categories"}
              />
              <SettingsMenuItem
                  icon={<Webhook className="h-5 w-5" />}
                  title={t("Webhooks")}
                  description={t("Configure external integrations and automation")}
                  onClick={() => handleSectionChange("webhooks")}
                  isActive={activeSection === "webhooks"}
              />
              <SettingsMenuItem
                  icon={<Globe2 className="h-5 w-5" />}
                  title={t("Language & Translation")}
                  description={t("Configure your language preferences and translations")}
                  onClick={() => handleSectionChange("translation")}
                  isActive={activeSection === "translation"}
              />
              {isAdmin && (
                  <SettingsMenuItem
                      icon={<ShieldAlert className="h-5 w-5" />}
                      title={t("Admin Settings")}
                      description={t("Access administrative functions and data")}
                      onClick={() => handleSectionChange("admin")}
                      isActive={activeSection === "admin"}
                  />
              )}
              <SettingsMenuItem
                  icon={<LogOut className="h-5 w-5" />}
                  title={t("Log Out")}
                  description={t("Sign out of your account")}
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
                <div className="flex-1 bg-background rounded-lg border p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">
                  {renderContent()}
                </div>
            )}
          </div>
        </div>
      </div>
  );
};

export default Settings;