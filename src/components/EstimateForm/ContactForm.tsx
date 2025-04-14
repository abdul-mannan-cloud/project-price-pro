import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { ContactFormHeader } from "./ContactFormHeader";
import { ContactFormFields } from "./ContactFormFields";
import { ContactFormButtons } from "./ContactFormButtons";
import { EstimateAnimation } from "./EstimateAnimation";
import { TimeAvailabilitySelector } from "./TimeAvailabilitySelector";

interface ContactFormProps {
  onSubmit: (data: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    timePreference?: {
      flexibility: "on_date" | "before_date" | "flexible";
      date?: string;
      timeOfDay?: "morning" | "midday" | "afternoon" | "evening";
      needSpecificTime: boolean;
    };
  }) => void;
  leadId?: string;
  estimate?: any;
  contractor?: any;
  contractorId?: string;
  onSkip?: () => Promise<void>;
}

export const ContactForm = ({
                              onSubmit,
                              leadId,
                              estimate,
                              contractor,
                              onSkip
                            }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [timePreference, setTimePreference] = useState<{
    flexibility: "on_date" | "before_date" | "flexible";
    date?: string;
    timeOfDay?: "morning" | "midday" | "afternoon" | "evening";
    needSpecificTime: boolean;
  }>({
    flexibility: "flexible",
    needSpecificTime: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [isCurrentUserContractor, setIsCurrentUserContractor] = useState(false);
  const params = useParams();
  // Get contractor ID from URL, handling both route patterns
  const urlContractorId = params.contractorId || params['*'];

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user is a contractor
        const { data: contractor } = await supabase
            .from('contractors')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (contractor) {
          setIsCurrentUserContractor(true);
        }
      }
    };

    checkCurrentUser();
  }, []);

  const verifyEmailExistence = async (email: string): Promise<boolean> => {
    // const res = await fetch(`https://apilayer.net/api/check?access_key=YOUR_API_KEY&email=${email}`);
    // const data = await res.json();
    // return data.smtp_check === true; // smtp_check indicates if mailbox exists
    return true
  };  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      const { email } = formData;
  
      const emailExists = await verifyEmailExistence(email);
      if (!emailExists) {
        throw new Error("The email address appears to be invalid or not reachable.");
      }
  
      // Proceed with your existing logic...
      if (!leadId) {
        console.error('Missing leadId in ContactForm');
        throw new Error("Unable to process your request at this time");
      }
  
      // (rest of submission logic...)
  
      onSubmit({
        ...formData,
        timePreference
      });
  
    } catch (error: any) {
      console.error('Error processing form:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: error.message || "Unable to process your request. Please try again.",
        variant: "destructive",
      });
    }
  };
  


  const handleSkipForm = async () => {
    if (!leadId || !onSkip) return;

    setIsSubmitting(true);

    try {
      // Get the contractor ID from URL first, then fallback to logged in user
      const effectiveContractorId = urlContractorId || (await supabase.auth.getUser()).data.user?.id;

      if (!effectiveContractorId) {
        throw new Error("No contractor ID available");
      }

      // Update lead as test estimate
      const { error: updateError } = await supabase
          .from('leads')
          .update({
            is_test_estimate: true,
            contractor_id: effectiveContractorId
          })
          .eq('id', leadId);

      if (updateError) throw updateError;

      // Let parent component handle estimate generation
      await onSkip();
      setIsSubmitting(false);

    } catch (error) {
      console.error('Error skipping form:', error);
      setIsSubmitting(false);
      toast({
        title: "Error",
        description: "Unable to skip form. Please try again.",
        variant: "destructive",
      });
    }
  };

  const buttonStyle = contractor?.branding_colors?.primary
      ? { backgroundColor: contractor.branding_colors.primary }
      : undefined;

  return (
      <div className="relative">
        <div className="fixed inset-0 z-10">
          <EstimateAnimation />
        </div>
        <div className="fixed inset-0 bg-black/5 flex items-center justify-center z-20">
          <div className="w-full max-w-md mx-auto bg-white rounded-xl p-6 shadow-lg animate-fadeIn">
            <ContactFormHeader />

            <form onSubmit={handleSubmit} className="space-y-6">
              <ContactFormFields
                  formData={formData}
                  onChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              />

              {/* Time Availability Component */}
              <div className="border-t pt-4">
                <TimeAvailabilitySelector
                    onChange={setTimePreference}
                />
              </div>

              <ContactFormButtons
                  isSubmitting={isSubmitting}
                  buttonStyle={buttonStyle}
                  isCurrentUserContractor={isCurrentUserContractor}
                  onSkip={handleSkipForm}
              />
            </form>
          </div>
        </div>
      </div>
  );
};