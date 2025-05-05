import {useEffect, useRef, useState} from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProgressSteps } from "@/components/ui/progress-steps";
import { ColorPicker } from "@/components/ui/color-picker";
import {Loader2} from "lucide-react";
import { set } from "date-fns";
import { cn } from "@/lib/utils";
import PricingPlans from "@/components/PricingPlans";
import PaymentMethodForm from "@/components/Onboarding/PaymentMethodForms";
import AddPaymentMethod from "@/components/Onboarding/addPaymentMethod";

type OnboardingStep = 0 | 1 | 2 | 3;

const OnboardingSteps = {
  BUSINESS_INFO: 0,
  BRANDING: 1,
  PRICING: 2,
  PAYMENT_METHOD: 3,
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

const DEFAULT_CONTRACTOR_ID = "82499c2f-960f-4042-b277-f86ea2d99929";

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
    stripe_customer_id: null,
    resend_contact_key: null,
    tier: null
  });

    const [businessAddress, setBusinessAddress] = useState("");
    const [addressSuggestions, setAddressSuggestions] = useState([]);
    const [isLoadingAddress, setIsLoadingAddress] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionRef = useRef(null);
    const addressInputRef = useRef(null);

    useEffect(() => {
        if (formData?.address) {
            setBusinessAddress(formData.address);
        }
    }, [formData.address]);

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
            const GOOGLE_API_KEY = "AIzaSyBuZj-RWOoAc24CaC2h4SY9LvD-WzQPtJs";
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

    const [touched, setTouched] = useState({
    businessName: false,
    fullName: false,
    industry: false,
    contactEmail: false,
    contactPhone: false,
  });

    useEffect(() => {
        const checkBusinessInfo = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    toast({
                        title: "Error",
                        description: "No authenticated user found. Please log in again.",
                        variant: "destructive",
                    });
                    navigate("/login");
                    return;
                }

                const { data: existingContractor, error } = await supabase
                    .from("contractors")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (error) throw error;

                if (existingContractor.verfied) {
                  navigate("/dashboard");
                } else if (existingContractor.tier) {
                  formData.tier = existingContractor.tier;
                  formData.businessName = existingContractor.business_name;
                  formData.contactEmail = existingContractor.contact_email;
                  formData.contactPhone = existingContractor.contact_phone;
                  formData.address = existingContractor.business_address;
                  formData.licenseNumber = existingContractor.license_number;
                  setCurrentStep(OnboardingSteps.PAYMENT_METHOD);
                } else if (existingContractor.business_name 
                    && existingContractor.contact_email  
                    && existingContractor.contact_phone ) {
                      formData.businessName = existingContractor.business_name;
                      formData.contactEmail = existingContractor.contact_email;
                      formData.contactPhone = existingContractor.contact_phone;
                      formData.address = existingContractor.business_address;
                      formData.licenseNumber = existingContractor.license_number;

                      setCurrentStep(OnboardingSteps.PRICING);
                    toast({
                        title: "Business info exists",
                        description: "Your business information has already been set up.",
                    })
                    return;
                }  

                setLoading(false); 
            } catch (error: any) {
                console.error("Error checking business info:", error);
                toast({
                    title: "Error",
                    description: "Something went wrong while checking business information.",
                    variant: "destructive",
                });
                setLoading(false);
            }
        };

        checkBusinessInfo();
    }, [navigate, toast]);

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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Error",
          description: "No authenticated user found. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      // First, try to get existing contractor
      const { data: existingContractor, error: fetchError } = await supabase
          .from("contractors")
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingContractor) {
        // Update existing contractor
        const { error: updateError } = await supabase
            .from("contractors")
            .update({
              business_name: formData.businessName,
              contact_email: formData.contactEmail,
              contact_phone: formData.contactPhone,
              business_address: businessAddress,
              license_number: formData.licenseNumber,
              branding_colors: {
                primary: formData.primaryColor,
                secondary: formData.secondaryColor,
              },
              tier: formData.tier,
              stripe_customer_id: formData.stripe_customer_id,
              resend_contact_key: formData.resend_contact_key,
            })
            .eq('id', existingContractor.id);

        if (updateError) throw updateError;

        // Update settings with same ID
        const { error: settingsError } = await supabase
            .from("contractor_settings")
            .update({
              minimum_project_cost: parseFloat(formData.minimumProjectCost),
              markup_percentage: parseFloat(formData.markupPercentage),
              tax_rate: parseFloat(formData.taxRate),
            })
            .eq('id', existingContractor.id);

        if (settingsError) throw settingsError;
      } else {
        // Generate a new UUID
        const newId = crypto.randomUUID();

        // Create new contractor with specified ID
        const { error: insertError } = await supabase
            .from("contractors")
            .insert({
              id: newId,
              user_id: user.id,
              business_name: formData.businessName,
              contact_email: formData.contactEmail,
              contact_phone: formData.contactPhone,
              business_address: formData.address,
              license_number: formData.licenseNumber,
              branding_colors: {
                primary: formData.primaryColor,
                secondary: formData.secondaryColor,
              },
              tier: formData.tier,
              stripe_customer_id: formData.stripe_customer_id,
              resend_contact_key: formData.resend_contact_key,
            });

        if (insertError) throw insertError;

        // Create settings with same ID
        const { error: settingsError } = await supabase
            .from("contractor_settings")
            .upsert({
              id: newId,
              minimum_project_cost: parseFloat(formData.minimumProjectCost),
              markup_percentage: parseFloat(formData.markupPercentage),
              tax_rate: parseFloat(formData.taxRate),
            });

        if (settingsError) throw settingsError;
      }

      toast({
        title: "Information saved!",
        description: "Your business information has been saved successfully.",
      });

      if (currentStep === OnboardingSteps.PAYMENT_METHOD) {
        navigate("/dashboard");
      } else {
        setCurrentStep((prev) => (prev + 1) as OnboardingStep);
      }
    } catch (error: any) {
      console.error('Onboarding error:', error);
      toast({
        title: "Error",
        description: error.message || "An error occurred while saving your information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

    // useEffect(() => {
    //     const checkBusinessInfo = async () => {
    //         try {
    //             const { data: { user } } = await supabase.auth.getUser();
    //             if (!user) {
    //                 toast({
    //                     title: "Error",
    //                     description: "No authenticated user found. Please log in again.",
    //                     variant: "destructive",
    //                 });
    //                 navigate("/login");
    //                 return;
    //             }

    //             // Check if the contractor exists
    //             const { data: existingContractor, error } = await supabase
    //                 .from("contractors")
    //                 .select("id")
    //                 .eq("user_id", user.id)
    //                 .maybeSingle();

    //             if (error) throw error;

    //             // If the business info exists, redirect to dashboard
    //             if (existingContractor) {
    //                 // navigate("/dashboard");
    //                 return;
    //             }

    //             setLoading(false); // No business info found, allow onboarding to continue
    //         } catch (error: any) {
    //             console.error("Error checking business info:", error);
    //             toast({
    //                 title: "Error",
    //                 description: "Something went wrong while checking business information.",
    //                 variant: "destructive",
    //             });
    //             setLoading(false);
    //         }
    //     };

    //     checkBusinessInfo();
    // }, [navigate, toast]);

    const [clientSecret, setClientSecret] = useState<string | null>(null);

    const createContact = async () => {
      try {
        const response = await supabase.functions.invoke('create-contact', {
          body: {
            email: "m.khizerr01@gmail.com",
            firstName: "khizer",
            lastName: "test",
            audienceId: "78261eea-8f8b-4381-83c6-79fa7120f1cf",
          },
        });

        if (response && response.data) {
          setFormData((prev) => ({ ...prev, resend_contact_key: response.data.data.data.id }));
        }
  
        const stripeResponse = await supabase.functions.invoke('create-stripe-customer', {
          body: {
            email: "m.khizerr01@gmail.com",
            name: "khizer",
          }
        });

        if (stripeResponse.data && stripeResponse.data.clientSecret) {
          setFormData((prev) => ({ ...prev, stripe_customer_id: stripeResponse.data.customer.id }));
          setClientSecret(stripeResponse.data.clientSecret);
        } else {
          console.error("Failed to retrieve client_secret:", stripeResponse.error);
        }

        if (response && stripeResponse) {          
          handleSubmit();
        }
      } catch (error) {
        console.error("Failed to create contact:", error);
      }
    };

    const updateGlobalColors = (primaryColor: string, secondaryColor: string) => {
    const root = document.documentElement;

    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--primary-foreground', '#FFFFFF');

    const primaryHex = primaryColor.replace('#', '');
    const r = parseInt(primaryHex.slice(0, 2), 16);
    const g = parseInt(primaryHex.slice(2, 4), 16);
    const b = parseInt(primaryHex.slice(4, 6), 16);

    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;

    let h, s;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r / 255:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g / 255:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60;
    }

    root.style.setProperty('--primary-100', `hsl(${h}, ${s * 100}%, 95%)`);
    root.style.setProperty('--primary-200', `hsl(${h}, ${s * 100}%, 90%)`);
    root.style.setProperty('--primary-300', `hsl(${h}, ${s * 100}%, 85%)`);
    root.style.setProperty('--primary-400', `hsl(${h}, ${s * 100}%, 80%)`);
    root.style.setProperty('--primary-500', primaryColor);
    root.style.setProperty('--primary-600', `hsl(${h}, ${s * 100}%, 45%)`);
    root.style.setProperty('--primary-700', `hsl(${h}, ${s * 100}%, 40%)`);

    root.style.setProperty('--secondary', secondaryColor);
    root.style.setProperty('--secondary-foreground', '#1d1d1f');

    root.style.setProperty('--accent', primaryColor);
    root.style.setProperty('--accent-foreground', '#FFFFFF');

    root.style.setProperty('--ring', primaryColor);
  };

  const handlePrimaryColorChange = (newColor: string) => {
    setFormData(prev => ({
      ...prev,
      primaryColor: newColor
    }));
    updateGlobalColors(newColor, formData.secondaryColor);
  };

  const handleSecondaryColorChange = (newColor: string) => {
    setFormData(prev => ({
      ...prev,
      secondaryColor: newColor
    }));
    updateGlobalColors(formData.primaryColor, newColor);
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

                  <div className="form-group relative">
                      <Input
                          ref={addressInputRef}
                          placeholder='Business Address (Optional)'
                          value={businessAddress}
                          onChange={(e) => handleAddressChange(e.target.value)}
                          onFocus={() => businessAddress && setShowSuggestions(true)}
                          className="h-12 px-4 pt-3 mt-2"
                      />
                      <label className="absolute top-1 left-2 mt-2 text-xs bg-transparent px-1 text-muted-foreground">
                          Business Address (Optional)
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
                  id="licenseNumber"
                  name="licenseNumber"
                  label="License Number (Optional)"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                />

                <div className="flex justify-between pt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
                    disabled={currentStep === OnboardingSteps.BUSINESS_INFO || loading}
                    className="text-[17px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    // disabled={!isBusinessInfoValid() || loading}
                    className="h-[44px] px-6 text-[17px] font-medium text-white hover:bg-primary-600 rounded-full"
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
              <div className="space-y-6">
                <div className="relative">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Primary Color
                  </label>
                  <div className="flex items-center w-full">
                    <ColorPicker
                      color={formData.primaryColor}
                      onChange={handlePrimaryColorChange}
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Secondary Color
                  </label>
                  <div className="flex items-center w-full">
                    <ColorPicker
                      color={formData.secondaryColor}
                      onChange={handleSecondaryColorChange}
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-6">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
                    disabled={loading}
                    className="text-[17px] font-medium text-muted-foreground hover:text-foreground"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    // disabled={loading}
                    className="h-[44px] px-6 text-[17px] font-medium text-white hover:bg-primary-600 rounded-full"
                  >
                    {loading ? "Saving..." : "Next"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case OnboardingSteps.PRICING:
        return (
          <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
                  Pricing Plans
                </h1>
                <p className="text-[15px] text-[#86868b]">
                  Select the pricing plan to proceed further
                </p>
              </div>
            <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8 space-y-6">
              <PricingPlans formData={formData} setFormData={setFormData} />
              <div className="flex justify-between pt-6">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((prev) => (prev - 1) as OnboardingStep)}
                disabled={loading}
                className="text-[17px] font-medium text-muted-foreground hover:text-foreground"
              >
                Back
              </Button>
              <Button
                onClick={createContact}
                // disabled={loading}
                className="h-[44px] px-6 text-[17px] font-medium text-white hover:bg-primary-600 rounded-full"
              >
                {loading ? "Saving..." : "Next"}
              </Button>
            </div>
          </div>
        </div>
        );
        case OnboardingSteps.PAYMENT_METHOD:
          return (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-[40px] font-semibold text-[#1d1d1f] tracking-tight">
                  Payment Method
                </h1>
                <p className="text-[15px] text-[#86868b]">
                  Add a payment method to complete your account setup.
                </p>
                <p className="text-[15px] text-primary font-medium">
                  Your card will not be charged now. You'll receive $1,000 in estimate credits to get started.
                </p>
              </div>
  
              <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8">
                <AddPaymentMethod customerName={formData.businessName} clientSecret={clientSecret} setCurrentStep={setCurrentStep}/>
              </div>
            </div>
          );

      default:
        return null;
    }
  };

  const steps=[
    { label: "Business Info", value: OnboardingSteps.BUSINESS_INFO },
    { label: "Branding", value: OnboardingSteps.BRANDING },
    { label: "Pricing", value: OnboardingSteps.PRICING },
    { label: "Payment", value: OnboardingSteps.PAYMENT_METHOD },
  ]

  return (
    <div className="min-h-screen bg-[#f5f5f7] py-12">
      <div className="container max-w-2xl mx-auto">
        <div className="md:block hidden">
          <ProgressSteps steps={steps} currentStep={currentStep} />
        </div>
        <div className="md:hidden block">
          <div
            className="flex items-center gap-2 justify-center align-middle"
          >
            {/* <div
              className={cn(
                "h-8 w-8 rounded-full transition-colors text-white flex items-center justify-center bg-primary",
              )}
            >
              {currentStep}
            </div> */}
            <span className={cn("font-medium text-primary")}>{steps[currentStep].label}</span>
          </div>
        </div>
        {renderStep()}
      </div>
    </div>
  );
};

export default Onboarding;
