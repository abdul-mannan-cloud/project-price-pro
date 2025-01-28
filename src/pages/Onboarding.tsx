import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OnboardingSteps = {
  BUSINESS_INFO: 0,
  BRANDING: 1,
  SETTINGS: 2,
} as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(OnboardingSteps.BUSINESS_INFO);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    primaryColor: "#6366F1",
    secondaryColor: "#4F46E5",
    minimumProjectCost: "1000",
    markupPercentage: "20",
    taxRate: "8.5",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("No user found");

      const { error: contractorError } = await supabase
        .from("contractors")
        .insert({
          id: user.id,
          business_name: formData.businessName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          branding_colors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor,
          },
        });

      if (contractorError) throw contractorError;

      const { error: settingsError } = await supabase
        .from("contractor_settings")
        .update({
          minimum_project_cost: parseFloat(formData.minimumProjectCost),
          markup_percentage: parseFloat(formData.markupPercentage),
          tax_rate: parseFloat(formData.taxRate),
        })
        .eq("id", user.id);

      if (settingsError) throw settingsError;

      toast({
        title: "Onboarding complete!",
        description: "Your account has been set up successfully.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case OnboardingSteps.BUSINESS_INFO:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={handleInputChange}
              />
            </div>
          </div>
        );
      case OnboardingSteps.BRANDING:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  name="primaryColor"
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  name="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  name="secondaryColor"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        );
      case OnboardingSteps.SETTINGS:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="minimumProjectCost">
                Minimum Project Cost ($)
              </Label>
              <Input
                id="minimumProjectCost"
                name="minimumProjectCost"
                type="number"
                value={formData.minimumProjectCost}
                onChange={handleInputChange}
                min="0"
                step="100"
              />
            </div>
            <div>
              <Label htmlFor="markupPercentage">Markup Percentage (%)</Label>
              <Input
                id="markupPercentage"
                name="markupPercentage"
                type="number"
                value={formData.markupPercentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                value={formData.taxRate}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg p-8 bg-[#111111] border-[#222222]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {currentStep === OnboardingSteps.BUSINESS_INFO && "Business Information"}
            {currentStep === OnboardingSteps.BRANDING && "Branding"}
            {currentStep === OnboardingSteps.SETTINGS && "Estimate Settings"}
          </h1>
          <p className="text-gray-400">
            {currentStep === OnboardingSteps.BUSINESS_INFO &&
              "Tell us about your business"}
            {currentStep === OnboardingSteps.BRANDING &&
              "Customize your brand colors"}
            {currentStep === OnboardingSteps.SETTINGS &&
              "Configure your estimate settings"}
          </p>
        </div>

        <div className="mb-8">{renderStep()}</div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => prev - 1)}
            disabled={currentStep === OnboardingSteps.BUSINESS_INFO || loading}
            className="bg-[#222222] text-white border-[#333333] hover:bg-[#333333]"
          >
            Previous
          </Button>
          <Button
            onClick={() => {
              if (currentStep === OnboardingSteps.SETTINGS) {
                handleSubmit();
              } else {
                setCurrentStep((prev) => prev + 1);
              }
            }}
            disabled={loading}
            className="bg-[#9b87f5] hover:bg-[#8a74f8] text-white"
          >
            {loading
              ? "Loading..."
              : currentStep === OnboardingSteps.SETTINGS
              ? "Complete"
              : "Next"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;