import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  contractorId,
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

  // Check if current user is the contractor
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

  // Fetch lead data if leadId exists to pre-fill form
  useEffect(() => {
    const fetchLeadData = async () => {
      if (!leadId) return;

      try {
        const { data, error } = await supabase
          .from('leads')
          .select('user_name, user_email, user_phone, project_address')
          .eq('id', leadId)
          .single();

        if (error) {
          console.error("Error fetching lead data:", error);
          return;
        }

        if (data) {
          setFormData({
            fullName: data.user_name || "",
            email: data.user_email || "",
            phone: data.user_phone || "",
            address: data.project_address || "",
          });
        }
      } catch (error) {
        console.error("Error fetching lead data:", error);
      }
    };

    fetchLeadData();
  }, [leadId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
  
    try {
      if (!leadId) {
        console.error('Missing leadId in ContactForm');
        throw new Error("Unable to process your request at this time");
      }

      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: formData.fullName,
          user_email: formData.email,
          user_phone: formData.phone,
          project_address: formData.address,
          available_time: timePreference.timeOfDay,
          available_date: timePreference.date,
          flexible: timePreference.flexibility
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }

      // Call the parent component's submit function
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
    if (!leadId || !onSkip) {
      console.error('Missing leadId or onSkip function');
      return;
    }

    setIsSubmitting(true);

    try {
      // Log the lead ID being used for debugging
      console.log("Skipping form for lead ID:", leadId);
      
      // Update lead as test estimate
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          is_test_estimate: true,
          contractor_id: contractorId || null
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Error updating lead:', updateError);
        throw updateError;
      }

      // Call the parent component's skip function
      await onSkip();
    } catch (error) {
      console.error('Error skipping form:', error);
      toast({
        title: "Error",
        description: "Unable to skip form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
              onChange={(field, value) => setFormData((prev) => {
                return ({...prev, [field]: value})
              })}
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