
import { Button } from "@/components/ui/3d-button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

export const ContactForm = ({ onSubmit, leadId, contractorId, estimate, contractor }: ContactFormProps) => {
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

  // Check if current user is the contractor
  useEffect(() => {
    const checkCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsCurrentUserContractor(user?.id === contractorId);
    };
    
    checkCurrentUser();
  }, [contractorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsProcessingEstimate(true);

    try {
      if (!leadId) {
        console.error('Missing leadId in ContactForm');
        throw new Error("Unable to process your request at this time");
      }

      // Update the lead with the form data first
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: formData.fullName,
          user_email: formData.email,
          user_phone: formData.phone,
          project_address: formData.address,
          status: 'processing',
          ...(contractorId ? { contractor_id: contractorId } : {})
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }

      // Start polling for estimate completion
      const pollEstimate = async () => {
        const { data: lead, error } = await supabase
          .from('leads')
          .select('estimate_data, status')
          .eq('id', leadId)
          .single();

        if (error) throw error;

        if (lead?.status === 'complete' && lead?.estimate_data) {
          setIsProcessingEstimate(false);
          
          // Generate the estimate URL
          const estimateUrl = `${window.location.origin}/estimate/${leadId}`;

          // Send emails only after estimate is complete
          const [emailResponse] = await Promise.all([
            // Send email to customer
            supabase.functions.invoke('send-estimate-email', {
              body: {
                name: formData.fullName,
                email: formData.email,
                estimateData: lead.estimate_data,
                estimateUrl,
                contractor
              }
            }),
            // Send notification to contractor
            supabase.functions.invoke('send-contractor-notification', {
              body: {
                customerInfo: formData,
                estimate: lead.estimate_data,
                contractor,
                questions: estimate?.questions || [],
                answers: estimate?.answers || []
              }
            })
          ]);

          if (emailResponse.error) {
            console.error('Email function error:', emailResponse.error);
            throw new Error(emailResponse.error);
          }

          toast({
            title: "Success!",
            description: "Your estimate has been sent to your email.",
          });

          onSubmit(formData);
          return true;
        }
        return false;
      };

      // Poll every 3 seconds until estimate is ready
      const pollInterval = setInterval(async () => {
        try {
          const isComplete = await pollEstimate();
          if (isComplete) {
            clearInterval(pollInterval);
            setIsSubmitting(false);
          }
        } catch (error) {
          console.error('Error polling estimate:', error);
          clearInterval(pollInterval);
          setIsSubmitting(false);
          setIsProcessingEstimate(false);
          toast({
            title: "Error",
            description: "Failed to process estimate. Please try again.",
            variant: "destructive",
          });
        }
      }, 3000);

      // Cleanup interval if component unmounts
      return () => clearInterval(pollInterval);

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
    if (!leadId) return;

    try {
      // Mark the lead as a test estimate
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          is_test_estimate: true,
          status: 'test',
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Use dummy data for the submission
      onSubmit({
        fullName: "Test User",
        email: "test@example.com",
        phone: "555-0123",
        address: "123 Test St"
      });
    } catch (error) {
      console.error('Error skipping form:', error);
      toast({
        title: "Error",
        description: "Unable to skip form. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get contractor's primary color from branding_colors
  const buttonStyle = contractor?.branding_colors?.primary 
    ? { backgroundColor: contractor.branding_colors.primary }
    : undefined;

  return (
    <div className="fixed inset-0 bg-black/13 flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-auto bg-background rounded-xl p-6 shadow-lg animate-fadeIn">
        {isProcessingEstimate ? (
          <div className="text-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Processing Your Estimate</h3>
            <p className="text-muted-foreground">
              Please wait while we finalize your custom estimate. This may take a few moments.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-8 pt-4">
              <h2 className="text-2xl font-semibold mb-3">Almost There!</h2>
              <p className="text-muted-foreground">
                Enter your contact details below to view your personalized project estimate. 
                We've analyzed your requirements and prepared a detailed breakdown just for you.
              </p>
            </div>
            
            <div className="space-y-5">
              <div className="form-group relative">
                <Input
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  required
                  className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                  Full Name
                </label>
              </div>
              
              <div className="form-group relative">
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                  Email
                </label>
              </div>
              
              <div className="form-group relative">
                <Input
                  type="tel"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                  Phone Number
                </label>
              </div>
              
              <div className="form-group relative">
                <Input
                  placeholder="Project Address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  required
                  className="h-12 px-4 pt-2"
                />
                <label className="absolute -top-2.5 left-2 text-sm bg-background px-1 text-muted-foreground">
                  Project Address
                </label>
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isSubmitting}
              style={buttonStyle}
            >
              {isSubmitting ? "Processing..." : "View Your Custom Estimate"}
            </Button>

            {isCurrentUserContractor && (
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={handleSkipForm}
              >
                Skip Form (Preview Mode)
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
