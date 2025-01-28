import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStep = 0 | 1 | 2;

const OnboardingSteps = {
  BUSINESS_INFO: 0,
  BRANDING: 1,
  SETTINGS: 2,
} as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingSteps.BUSINESS_INFO);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    contactEmail: "",
    contactPhone: "",
    primaryColor: "#007AFF",
    secondaryColor: "#F5F5F7",
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
          <div className="space-y-6">
            <div>
              <Label htmlFor="businessName" className="text-[17px] font-medium text-[#1d1d1f]">
                Business Name
              </Label>
              <Input
                id="businessName"
                name="businessName"
                value={formData.businessName}
                onChange={handleInputChange}
                required
                className="mt-2 h-[44px] rounded-xl border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[17px] shadow-sm transition-colors focus:border-[#0066cc] focus:ring-[#0066cc]"
                placeholder="Enter your business name"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail" className="text-[17px] font-medium text-[#1d1d1f]">
                Contact Email
              </Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={handleInputChange}
                required
                className="mt-2 h-[44px] rounded-xl border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[17px] shadow-sm transition-colors focus:border-[#0066cc] focus:ring-[#0066cc]"
                placeholder="Enter your email address"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone" className="text-[17px] font-medium text-[#1d1d1f]">
                Contact Phone
              </Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="mt-2 h-[44px] rounded-xl border border-[#d2d2d7] bg-[#fbfbfd] px-4 text-[17px] shadow-sm transition-colors focus:border-[#0066cc] focus:ring-[#0066cc]"
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        );
      case OnboardingSteps.BRANDING:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="primaryColor" className="text-[15px] font-medium text-gray-900">
                Primary Color
              </Label>
              <div className="mt-2 flex gap-3">
                <Input
                  id="primaryColor"
                  name="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  className="h-12 w-16 rounded-xl border-gray-300 bg-gray-50 p-1 transition-colors focus:border-blue-500 focus:ring-blue-500"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                  name="primaryColor"
                  className="h-12 flex-1 rounded-xl border-gray-300 bg-gray-50 px-4 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="secondaryColor" className="text-[15px] font-medium text-gray-900">
                Secondary Color
              </Label>
              <div className="mt-2 flex gap-3">
                <Input
                  id="secondaryColor"
                  name="secondaryColor"
                  type="color"
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  className="h-12 w-16 rounded-xl border-gray-300 bg-gray-50 p-1 transition-colors focus:border-blue-500 focus:ring-blue-500"
                />
                <Input
                  value={formData.secondaryColor}
                  onChange={handleInputChange}
                  name="secondaryColor"
                  className="h-12 flex-1 rounded-xl border-gray-300 bg-gray-50 px-4 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        );
      case OnboardingSteps.SETTINGS:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="minimumProjectCost" className="text-[15px] font-medium text-gray-900">
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
                className="mt-2 h-12 rounded-xl border-gray-300 bg-gray-50 px-4 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="markupPercentage" className="text-[15px] font-medium text-gray-900">
                Markup Percentage (%)
              </Label>
              <Input
                id="markupPercentage"
                name="markupPercentage"
                type="number"
                value={formData.markupPercentage}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
                className="mt-2 h-12 rounded-xl border-gray-300 bg-gray-50 px-4 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <Label htmlFor="taxRate" className="text-[15px] font-medium text-gray-900">
                Tax Rate (%)
              </Label>
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                value={formData.taxRate}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.1"
                className="mt-2 h-12 rounded-xl border-gray-300 bg-gray-50 px-4 shadow-sm transition-colors focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
            {currentStep === OnboardingSteps.BUSINESS_INFO && "Business Information"}
            {currentStep === OnboardingSteps.BRANDING && "Branding"}
            {currentStep === OnboardingSteps.SETTINGS && "Estimate Settings"}
          </h1>
          <p className="text-[19px] text-[#86868b] mt-2">
            {currentStep === OnboardingSteps.BUSINESS_INFO &&
              "Tell us about your business"}
            {currentStep === OnboardingSteps.BRANDING &&
              "Customize your brand colors"}
            {currentStep === OnboardingSteps.SETTINGS &&
              "Configure your estimate settings"}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8 mb-8">
          {renderStep()}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
            disabled={currentStep === OnboardingSteps.BUSINESS_INFO || loading}
            className="h-[44px] px-6 text-[17px] font-medium border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full"
          >
            Previous
          </Button>
          <Button
            onClick={() => {
              if (currentStep === OnboardingSteps.SETTINGS) {
                handleSubmit();
              } else {
                setCurrentStep((prev) => (prev + 1) as OnboardingStep);
              }
            }}
            disabled={loading}
            className="h-[44px] px-6 text-[17px] font-medium bg-[#0066cc] text-white hover:bg-[#0055b3] rounded-full"
          >
            {loading
              ? "Loading..."
              : currentStep === OnboardingSteps.SETTINGS
              ? "Complete"
              : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
