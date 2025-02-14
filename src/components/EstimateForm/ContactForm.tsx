
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
  contractorId?: string;
  estimate?: any;
  contractor?: any;
  onSkip?: () => Promise<void>;
}

export const ContactForm = ({ 
  onSubmit, 
  leadId, 
  estimate, 
  contractor, 
  contractorId: propContractorId,
  onSkip 
}: ContactFormProps) => {
  const { contractorId: urlContractorId } = useParams();
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
  
  // Use contractor ID from props or URL
  const effectiveContractorId = propContractorId || urlContractorId;

  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsCurrentUserContractor(user?.id === effectiveContractorId);
    };
    
    checkCurrentUser();
  }, [effectiveContractorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsProcessingEstimate(true);

    try {
      if (!leadId) {
        console.error('Missing leadId in ContactForm');
        throw new Error("Unable to process your request at this time");
      }

      if (!effectiveContractorId) {
        console.error('Missing contractorId in ContactForm');
        throw new Error("Unable to identify the contractor");
      }

      console.log('Processing estimate with:', { leadId, contractorId: effectiveContractorId });

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

      const { data: estimateData, error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId,
          contractorId: effectiveContractorId
        }
      });

      if (estimateError) {
        console.error('Error generating estimate:', estimateError);
        throw estimateError;
      }

      console.log('Estimate generated successfully:', estimateData);
      onSubmit(formData);
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
    if (!leadId || !effectiveContractorId) return;

    try {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          is_test_estimate: true,
          status: 'test',
          contractor_id: effectiveContractorId
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      if (onSkip) {
        await onSkip();
      }
    } catch (error) {
      console.error('Error skipping form:', error);
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
