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
  contractorId: string;
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
  
  // Use contractor ID from props or URL, ensure it's cleaned
  const effectiveContractorId = (() => {
    try {
      const rawId = propContractorId || urlContractorId;
      if (!rawId) return null;
      
      // First decode the URL parameter
      const decoded = decodeURIComponent(rawId);
      // Remove special characters and clean
      const cleaned = decoded.replace(/[:?]/g, '').trim();
      
      console.log('Processing contractor ID:', {
        raw: rawId,
        decoded,
        cleaned
      });
      
      return cleaned;
    } catch (error) {
      console.error('Error processing contractor ID:', error);
      return null;
    }
  })();

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

      // Generate estimate with explicit contractor ID
      const { data: estimateData, error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId,
          contractorId: effectiveContractorId,
          formData 
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

      // Verify the update
      const { data: verifiedLead, error: verifyError } = await supabase
        .from('leads')
        .select('contractor_id')
        .eq('id', leadId)
        .single();

      if (verifyError) throw verifyError;

      console.log('Lead marked as test with contractor:', verifiedLead);

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
