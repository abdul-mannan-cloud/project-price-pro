
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (initials: string) => void;
  contractorId?: string;
  leadId?: string;
  estimateData?: any;
}

export const SignatureDialog = ({ 
  isOpen, 
  onClose, 
  onSign,
  contractorId,
  leadId,
  estimateData 
}: SignatureDialogProps) => {
  const [initials, setInitials] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initials.trim()) return;

    setIsSubmitting(true);
    try {
      // Update the lead with the client signature
      if (leadId) {
        const { error: updateError } = await supabase
          .from('leads')
          .update({
            client_signature: initials,
            client_signature_date: new Date().toISOString()
          })
          .eq('id', leadId);

        if (updateError) throw updateError;
      }

      // Get contractor email and send notification
      if (contractorId) {
        const { data: contractor, error: contractorError } = await supabase
          .from('contractors')
          .select('contact_email,business_name')
          .eq('id', contractorId)
          .single();

        if (contractorError) throw contractorError;

        // Send email to contractor
        const { error: emailError } = await supabase.functions.invoke('send-estimate-email', {
          body: {
            estimateId: leadId,
            contractorEmail: contractor.contact_email,
            estimateData,
            estimateUrl: `${window.location.origin}/estimate/${leadId}`,
            clientName: initials,
            businessName: contractor.business_name,
          }
        });

        if (emailError) throw emailError;
      }

      onSign(initials);
      onClose();
      toast({
        title: "Success",
        description: "Signature submitted successfully",
      });
    } catch (error) {
      console.error('Error signing estimate:', error);
      toast({
        title: "Error",
        description: "Failed to submit signature. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Digital Signature</DialogTitle>
          <DialogDescription>
            By entering your initials below, you agree that this digital signature
            is as valid as a physical signature and you accept the terms of this estimate.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Enter your initials"
            value={initials}
            onChange={(e) => setInitials(e.target.value)}
            className="w-full"
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing..." : "Sign Estimate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
