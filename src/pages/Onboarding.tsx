import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CustomSelect,
} from "@/components/ui/custom-select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { StepIndicator } from "@/components/EstimateForm/StepIndicator";

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
  const [activeColorType, setActiveColorType] = useState<'primary' | 'secondary'>('primary');
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

      // First check if contractor exists
      const { data: existingContractor } = await supabase
        .from("contractors")
        .select()
        .eq('id', user.id)
        .single();

      if (existingContractor) {
        // If contractor exists, update instead of insert
        const { error: updateError } = await supabase
          .from("contractors")
          .update({
            business_name: formData.businessName,
            contact_email: formData.contactEmail,
            contact_phone: formData.contactPhone,
            branding_colors: {
              primary: formData.primaryColor,
              secondary: formData.secondaryColor,
            },
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        // If contractor doesn't exist, proceed with insert
        const { error: insertError } = await supabase
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

        if (insertError) throw insertError;
      }

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
            <div className="text-center space-y-2">
              <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
                Business Information
              </h1>
              <p className="text-[15px] text-[#86868b]">
                This information will be visible to customers when they show interest in your services.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8 space-y-4">
              <div className="space-y-4">
                <Input
                  id="businessName"
                  name="businessName"
                  label="Business Name"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  required
                  className={isRequiredFieldEmpty('businessName') ? 'border-red-500' : ''}
                />
                {isRequiredFieldEmpty('businessName') && (
                  <span className="text-red-500 text-xs mt-1">Business name is required</span>
                )}

                <Input
                  id="fullName"
                  name="fullName"
                  label="Full Name"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className={isRequiredFieldEmpty('fullName') ? 'border-red-500' : ''}
                />
                {isRequiredFieldEmpty('fullName') && (
                  <span className="text-red-500 text-xs mt-1">Full name is required</span>
                )}

                <div className="relative">
                  <CustomSelect
                    label="Industry"
                    value={formData.industry}
                    onValueChange={handleSelectChange}
                    options={CONSTRUCTION_INDUSTRIES.map(industry => ({
                      value: industry,
                      label: industry
                    }))}
                    className={isRequiredFieldEmpty('industry') ? 'border-red-500' : ''}
                  />
                  {isRequiredFieldEmpty('industry') && (
                    <span className="text-red-500 text-xs mt-1">Industry is required</span>
                  )}
                </div>

                <Input
                  id="contactPhone"
                  name="contactPhone"
                  label="Contact Phone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={handleInputChange}
                  required
                  className={isRequiredFieldEmpty('contactPhone') ? 'border-red-500' : ''}
                />
                {isRequiredFieldEmpty('contactPhone') && (
                  <span className="text-red-500 text-xs mt-1">Contact phone is required</span>
                )}

                <Input
                  id="contactEmail"
                  name="contactEmail"
                  label="Contact Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  required
                  className={isRequiredFieldEmpty('contactEmail') ? 'border-red-500' : ''}
                />
                {isRequiredFieldEmpty('contactEmail') && (
                  <span className="text-red-500 text-xs mt-1">Contact email is required</span>
                )}

                <Input
                  id="address"
                  name="address"
                  label="Business Address (Optional)"
                  value={formData.address}
                  onChange={handleInputChange}
                />

                <Input
                  id="licenseNumber"
                  name="licenseNumber"
                  label="License Number (Optional)"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                />

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
                    disabled={!isBusinessInfoValid() || loading}
                    className="h-[44px] px-6 text-[17px] font-medium bg-[#007aff] text-white hover:bg-[#0066cc] rounded-full"
                  >
                    {loading ? "Saving..." : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case OnboardingSteps.BRANDING:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
                Branding
              </h1>
              <p className="text-[15px] text-[#86868b]">
                Customize your brand colors to match your business identity.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8 space-y-6">
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setActiveColorType('primary')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeColorType === 'primary'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Primary Color
                </button>
                <button
                  onClick={() => setActiveColorType('secondary')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeColorType === 'secondary'
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  Secondary Color
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor={`${activeColorType}Color`} className="block text-sm font-medium text-gray-700 mb-2">
                    {activeColorType === 'primary' ? 'Primary' : 'Secondary'} Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <div 
                      className="w-10 h-10 rounded border border-[#d2d2d7]"
                      style={{ backgroundColor: formData[`${activeColorType}Color`] }}
                    />
                    <Input
                      id={`${activeColorType}Color`}
                      name={`${activeColorType}Color`}
                      type="color"
                      value={formData[`${activeColorType}Color`]}
                      onChange={handleInputChange}
                      className="w-full h-[38px]"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
                    disabled={loading}
                    className="h-[44px] px-6 text-[17px] font-medium border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-[44px] px-6 text-[17px] font-medium bg-[#007aff] text-white hover:bg-[#0066cc] rounded-full"
                  >
                    {loading ? "Saving..." : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case OnboardingSteps.SETTINGS:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
                Business Settings
              </h1>
              <p className="text-[15px] text-[#86868b]">
                Configure your business settings for estimates and invoices.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8 space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <label htmlFor="minimumProjectCost">Minimum Project Cost ($)</label>
                  <Input
                    id="minimumProjectCost"
                    name="minimumProjectCost"
                    type="number"
                    value={formData.minimumProjectCost}
                    onChange={handleInputChange}
                    className="h-[38px] rounded-lg border border-[#d2d2d7] bg-[#fbfbfd] px-3 text-[15px]"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="markupPercentage">Markup Percentage (%)</label>
                  <Input
                    id="markupPercentage"
                    name="markupPercentage"
                    type="number"
                    value={formData.markupPercentage}
                    onChange={handleInputChange}
                    className="h-[38px] rounded-lg border border-[#d2d2d7] bg-[#fbfbfd] px-3 text-[15px]"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="taxRate">Tax Rate (%)</label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    value={formData.taxRate}
                    onChange={handleInputChange}
                    className="h-[38px] rounded-lg border border-[#d2d2d7] bg-[#fbfbfd] px-3 text-[15px]"
                  />
                </div>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
                    disabled={loading}
                    className="h-[44px] px-6 text-[17px] font-medium border border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#f5f5f7] rounded-full"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="h-[44px] px-6 text-[17px] font-medium bg-[#007aff] text-white hover:bg-[#0066cc] rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Complete"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-12">
      <div className="container max-w-2xl mx-auto">
        <StepIndicator
          currentStep={currentStep}
          steps={[
            { label: "Business Info", value: OnboardingSteps.BUSINESS_INFO },
            { label: "Branding", value: OnboardingSteps.BRANDING },
            { label: "Settings", value: OnboardingSteps.SETTINGS },
          ]}
        />
        {renderStep()}
      </div>
    </div>
  );
};

export default Onboarding;