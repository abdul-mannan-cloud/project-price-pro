import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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
}

export const ContactForm = ({ onSubmit, leadId, contractorId }: ContactFormProps) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!leadId) {
        console.error('Missing leadId in ContactForm');
        throw new Error("Unable to process your request at this time");
      }

      console.log('Submitting contact form with:', { leadId, contractorId, formData });

      // Only update the lead if we have a valid leadId
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: formData.fullName,
          user_email: formData.email,
          user_phone: formData.phone,
          project_address: formData.address,
          status: 'new',
          // Only include contractor_id if it exists
          ...(contractorId ? { contractor_id: contractorId } : {})
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }

      onSubmit(formData);
    } catch (error) {
      console.error('Error processing form:', error);
      toast({
        title: "Error",
        description: "Unable to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="w-full max-w-md mx-auto bg-background rounded-xl p-6 shadow-lg animate-fadeIn">
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
          >
            {isSubmitting ? "Processing..." : "View Your Custom Estimate"}
          </Button>
        </form>
      </div>
    </div>
  );
};