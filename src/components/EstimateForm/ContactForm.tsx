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
      if (!leadId || !contractorId) {
        throw new Error("Missing required IDs");
      }

      // Update the lead with contact information
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          user_name: formData.fullName,
          user_email: formData.email,
          user_phone: formData.phone,
          project_address: formData.address,
          status: 'new',
          contractor_id: contractorId
        })
        .eq('id', leadId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw updateError;
      }

      // Call the onSubmit callback with the form data
      onSubmit(formData);
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Error",
        description: "Failed to save your information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md mx-auto bg-background rounded-xl p-6 shadow-lg animate-fadeIn">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-2">Almost There!</h2>
            <p className="text-muted-foreground">
              Enter your contact details below to view your personalized project estimate. 
              We've analyzed your requirements and prepared a detailed breakdown just for you.
            </p>
          </div>
          
          <div className="form-group">
            <Input
              placeholder="Full Name"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              required
              className="form-input"
            />
            <label className="form-label">Full Name</label>
          </div>
          
          <div className="form-group">
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="form-input"
            />
            <label className="form-label">Email</label>
          </div>
          
          <div className="form-group">
            <Input
              type="tel"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
              className="form-input"
            />
            <label className="form-label">Phone Number</label>
          </div>
          
          <div className="form-group">
            <Input
              placeholder="Project Address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              required
              className="form-input"
            />
            <label className="form-label">Project Address</label>
          </div>
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "View Your Custom Estimate"}
          </Button>
        </form>
      </div>
    </div>
  );
};