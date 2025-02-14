
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "react-router-dom";
import { ContactFormHeader } from "./ContactFormHeader";
import { ContactFormFields } from "./ContactFormFields";
import { ContactFormButtons } from "./ContactFormButtons";
import { LoadingScreen } from "./LoadingScreen";
import { EstimateAnimation } from "./EstimateAnimation";

interface ContactFormProps {
  onSubmit: (data: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingEstimate, setIsProcessingEstimate] = useState(false);
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
          .eq('id', user.id)
          .maybeSingle();
        
        if (contractor) {
          setIsCurrentUserContractor(true);
        }
      }
    };
    
    checkCurrentUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsProcessingEstimate(true);

    try {
      if (!leadId) {
        console.error('Missing leadId in ContactForm');
        throw new Error("Unable to process your request at this time");
      }

      // Get the contractor ID from URL first, then fallback to logged in user
      const effectiveContractorId = urlContractorId || (await supabase.auth.getUser()).data.user?.id;

      console.log('Using contractor ID:', {
        urlContractorId,
        effectiveContractorId,
        params
      });

      if (!effectiveContractorId) {
        console.error('No contractor ID available');
        throw new Error("Unable to identify the contractor");
      }

      console.log('Processing estimate with:', { 
        leadId, 
        contractorId: effectiveContractorId,
        formData 
      });

      // First update the lead with contact info and contractor_id
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: formData.fullName,
          user_email: formData.email,
          user_phone: formData.phone,
          project_address: formData.address,
          status: 'processing',
          contractor_id: effectiveContractorId
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }

      // Call onSubmit to process form and initiate estimate generation
      onSubmit(formData);
      
      // We don't set isSubmitting to false here as the parent will handle that
      // through the estimate generation process
    } catch (error) {
      console.error('Error processing form:', error);
      setIsSubmitting(false);
      setIsProcessingEstimate(false);
      toast({
        title: "Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSkipForm = async () => {
    if (!onSkip) return;

    setIsSubmitting(true);
    setIsProcessingEstimate(true);

    try {
      await onSkip();
      // Don't set isSubmitting to false here as it will be handled by the parent
      // through the estimate generation process
    } catch (error) {
      console.error('Error skipping form:', error);
      setIsSubmitting(false);
      setIsProcessingEstimate(false);
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
