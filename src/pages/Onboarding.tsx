import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStep = 0 | 1 | 2;

const OnboardingSteps = {
  BUSINESS_INFO: 0,
  BRANDING: 1,
  SETTINGS: 2,
} as const;

const CONSTRUCTION_INDUSTRIES = [
  "General Contractor",
  "Residential Construction",
  "Commercial Construction",
  "Remodeling",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Roofing",
  "Landscaping",
  "Interior Design",
  "Painting",
  "Flooring",
  "Masonry",
  "Carpentry",
] as const;

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingSteps.BUSINESS_INFO);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    fullName: "",
    industry: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    licenseNumber: "",
    primaryColor: "#007AFF",
    secondaryColor: "#F5F5F7",
    minimumProjectCost: "1000",
    markupPercentage: "20",
    taxRate: "8.5",
  });

  const [touched, setTouched] = useState({
    businessName: false,
    fullName: false,
    industry: false,
    contactEmail: false,
    contactPhone: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, industry: value }));
    setTouched((prev) => ({ ...prev, industry: true }));
  };

  const isRequiredFieldEmpty = (fieldName: string) => {
    return touched[fieldName as keyof typeof touched] && !formData[fieldName as keyof typeof formData];
  };

  const isBusinessInfoValid = () => {
    const requiredFields = ['businessName', 'fullName', 'industry', 'contactEmail', 'contactPhone'];
    return requiredFields.every(field => formData[field as keyof typeof formData]);
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
        title: "Information saved!",
        description: "Your business information has been saved successfully.",
      });
      
      if (currentStep === OnboardingSteps.SETTINGS) {
        navigate("/dashboard");
      } else {
        setCurrentStep((prev) => (prev + 1) as OnboardingStep);
      }
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
            <div className="text-center">
              <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
                Business Information
              </h1>
              <p className="text-[15px] text-[#86868b] mt-2">
                This information will be visible to customers when they show interest in your services.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8 space-y-4">
              <div className="relative">
                <Input
                  id="businessName"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  placeholder="Business Name"
                  className={`h-[38px] rounded-lg border ${
                    isRequiredFieldEmpty('businessName') ? 'border-red-500' : 'border-[#d2d2d7]'
                  } bg-[#fbfbfd] px-3 text-[15px] shadow-sm transition-all placeholder:text-[13px] focus:border-[#0066cc] focus:ring-[#0066cc] focus:placeholder:-translate-y-4 focus:placeholder:text-[11px] focus:placeholder:text-[#86868b] pt-4`}
                />
                {isRequiredFieldEmpty('businessName') && (
                  <span className="text-red-500 text-xs mt-1">Business name is required</span>
                )}
              </div>

              <div className="relative">
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  placeholder="Full Name"
                  className={`h-[38px] rounded-lg border ${
                    isRequiredFieldEmpty('fullName') ? 'border-red-500' : 'border-[#d2d2d7]'
                  } bg-[#fbfbfd] px-3 text-[15px] shadow-sm transition-all placeholder:text-[13px] focus:border-[#0066cc] focus:ring-[#0066cc] focus:placeholder:-translate-y-4 focus:placeholder:text-[11px] focus:placeholder:text-[#86868b] pt-4`}
                />
                {isRequiredFieldEmpty('fullName') && (
                  <span className="text-red-500 text-xs mt-1">Full name is required</span>
                )}
              </div>

              <div className="relative">
                <Select value={formData.industry} onValueChange={handleSelectChange}>
                  <SelectTrigger 
                    className={`h-[38px] rounded-lg border ${
                      isRequiredFieldEmpty('industry') ? 'border-red-500' : 'border-[#d2d2d7]'
                    } bg-[#fbfbfd] px-3 text-[15px] shadow-sm`}
                  >
                    <SelectValue placeholder="Select Industry" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {CONSTRUCTION_INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isRequiredFieldEmpty('industry') && (
                  <span className="text-red-500 text-xs mt-1">Industry is required</span>
                )}
              </div>

              <div className="relative">
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  required
                  placeholder="Contact Phone"
                  className={`h-[38px] rounded-lg border ${
                    isRequiredFieldEmpty('contactPhone') ? 'border-red-500' : 'border-[#d2d2d7]'
                  } bg-[#fbfbfd] px-3 text-[15px] shadow-sm transition-all placeholder:text-[13px] focus:border-[#0066cc] focus:ring-[#0066cc] focus:placeholder:-translate-y-4 focus:placeholder:text-[11px] focus:placeholder:text-[#86868b] pt-4`}
                />
                {isRequiredFieldEmpty('contactPhone') && (
                  <span className="text-red-500 text-xs mt-1">Contact phone is required</span>
                )}
              </div>

              <div className="relative">
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  required
                  placeholder="Contact Email"
                  className={`h-[38px] rounded-lg border ${
                    isRequiredFieldEmpty('contactEmail') ? 'border-red-500' : 'border-[#d2d2d7]'
                  } bg-[#fbfbfd] px-3 text-[15px] shadow-sm transition-all placeholder:text-[13px] focus:border-[#0066cc] focus:ring-[#0066cc] focus:placeholder:-translate-y-4 focus:placeholder:text-[11px] focus:placeholder:text-[#86868b] pt-4`}
                />
                {isRequiredFieldEmpty('contactEmail') && (
                  <span className="text-red-500 text-xs mt-1">Contact email is required</span>
                )}
              </div>

              <div className="relative">
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Business Address (Optional)"
                  className="h-[38px] rounded-lg border border-[#d2d2d7] bg-[#fbfbfd] px-3 text-[15px] shadow-sm transition-all placeholder:text-[13px] focus:border-[#0066cc] focus:ring-[#0066cc] focus:placeholder:-translate-y-4 focus:placeholder:text-[11px] focus:placeholder:text-[#86868b] pt-4"
                />
              </div>

              <div className="relative">
                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="License Number (Optional)"
                  className="h-[38px] rounded-lg border border-[#d2d2d7] bg-[#fbfbfd] px-3 text-[15px] shadow-sm transition-all placeholder:text-[13px] focus:border-[#0066cc] focus:ring-[#0066cc] focus:placeholder:-translate-y-4 focus:placeholder:text-[11px] focus:placeholder:text-[#86868b] pt-4"
                />
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
                  disabled={currentStep === OnboardingSteps.BUSINESS_INFO || loading}
                  className="h-[44px] px-6 text-[17px] font-medium border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full"
                >
                  Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !isBusinessInfoValid()}
                  className={`h-[44px] px-6 text-[17px] font-medium text-white rounded-full ${
                    isBusinessInfoValid()
                      ? 'bg-[#0066cc] hover:bg-[#0055b3]'
                      : 'bg-[#0066cc]/50 cursor-not-allowed'
                  }`}
                >
                  {loading ? "Saving..." : "Next"}
                </Button>
              </div>
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
        {renderStep()}
      </div>
    </div>
  );
};

export default Onboarding;
