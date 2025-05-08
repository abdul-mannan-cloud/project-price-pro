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
  isContractorSignature?: boolean; // Prop to determine signature type
}

export const SignatureDialog = ({ 
  isOpen, 
  onClose, 
  onSign,
  contractorId,
  leadId,
  estimateData,
  isContractorSignature = true // Default to contractor signature
}: SignatureDialogProps) => {
  const [initials, setInitials] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initials.trim()) return;

    setIsSubmitting(true);
    try {
      // Update the lead with the appropriate signature based on who is signing
      if (leadId) {
        const updateData = isContractorSignature
          ? {
              contractor_signature: initials,
              contractor_signature_date: new Date().toISOString()
            }
          : {
              client_signature: initials,
              client_signature_date: new Date().toISOString()
            };

        const { error: updateError } = await supabase
          .from('leads')
          .update(updateData)
          .eq('id', leadId);

        if (updateError) throw updateError;
      }

      // Try to send notifications, but don't block the signature process if they fail
      if (isContractorSignature && contractorId) {
        try {
          // Get contractor details for notifications
          const { data: contractor, error: contractorError } = await supabase
            .from('contractors')
            .select('contact_email,contact_phone,business_name')
            .eq('id', contractorId)
            .single();

          if (!contractorError && contractor) {
            // Prepare basic data for notifications
            const estimateUrl = `${window.location.origin}/estimate/${leadId}`;
            const businessName = contractor?.business_name || 'Your Business';
            const projectTitle = estimateData?.project_title || 'Project';

            // Skip lead query as it's failing, and use estimateData directly
            // Try to send email notification to contractor
            if (contractor.contact_email) {
              try {
                const { error: emailError } = await supabase.functions.invoke('send-customer-estimate-email', {
                  body: {
                    estimateId: leadId,
                    contractorEmail: contractor.contact_email,
                    contractorName: contractor.business_name || 'Contractor',
                    contractorPhone: contractor.contact_phone || '',
                    customerEmail: contractor.contact_email,
                    customerName: contractor.business_name || 'Contractor',
                    estimateData: estimateData || { totalCost: 0, project_title: 'Project' },
                    estimateUrl: estimateUrl,
                    businessName: businessName,
                    signatureType: 'contractor',
                    signerInitials: initials
                  }
                });

                if (emailError) {
                  console.error('Error sending email notification:', emailError);
                }
              } catch (emailError) {
                console.error('Error calling email function:', emailError);
              }
            }

            // Try to send SMS notification to contractor
            if (contractor.contact_phone) {
              try {
                const smsMessage = `You have signed the estimate for ${projectTitle}. Signature: ${initials}. Date: ${new Date().toLocaleDateString()}.`;
                
                await supabase.functions.invoke('send-sms', {
                  body: {
                    phone: contractor.contact_phone,
                    message: smsMessage,
                    recipientType: 'contractor'
                  }
                });
              } catch (smsError) {
                console.error('Error calling SMS function:', smsError);
              }
            }
          } else {
            console.warn('Could not find contractor for notifications:', contractorError);
          }
        } catch (notificationError) {
          console.error('Error sending notifications, but signature was recorded:', notificationError);
        }
      }

      // Call the callback to update UI
      onSign(initials);
      onClose();
      
      toast({
        title: "Success",
        description: `${isContractorSignature ? "Contractor" : "Client"} signature submitted successfully`,
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
          <DialogTitle>
            {isContractorSignature ? "Contractor Signature" : "Client Signature"}
          </DialogTitle>
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