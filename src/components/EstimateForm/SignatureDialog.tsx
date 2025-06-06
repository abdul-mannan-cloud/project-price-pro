import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSign: (signature: string) => void;
  contractorId?: string | null;
  leadId?: string;
  estimateData?: any;
  isContractorSignature?: boolean; // New prop to determine if this is for a contractor or client
}

export const SignatureDialog = ({
  isOpen,
  onClose,
  onSign,
  contractorId,
  leadId,
  estimateData,
  isContractorSignature = false // Default to client signature
}: SignatureDialogProps) => {
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signature.trim()) {
      toast({
        title: "Error",
        description: "Please enter your signature.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // If lead ID and contractor ID are provided, update the lead
      if (leadId && contractorId) {
        // Determine which signature field to update based on isContractorSignature prop
       const updatePayload = isContractorSignature
  ? {
      contractor_signature: signature,
      contractor_signature_date: new Date().toISOString(),
      status: "approved"          // NEW – contractor signs → approved
    }
  : {
      client_signature: signature,
      client_signature_date: new Date().toISOString(),
      status: "in-progress"       // NEW – client signs    → in‑progress
    };
       const { error: dbError } = await supabase
           .from("leads")
           .update(updatePayload)
           .eq("id", leadId);
          
         if (dbError) throw dbError;
        
        // Show success message
        toast({
          title: "Success",
          description: isContractorSignature 
            ? "Contractor signature added successfully."
            : "Client signature added successfully.",
        });
      }
      
      // Call onSign callback with signature
      onSign(signature);
      
      // Close dialog and reset state
      setSignature("");
      onClose();
    } catch (error) {
      console.error("Error saving signature:", error);
      toast({
        title: "Error",
        description: "Failed to save signature. Please try again.",
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
            {isContractorSignature ? "Add Contractor Signature" : "Add Signature"}
          </DialogTitle>
          <DialogDescription>
            {isContractorSignature 
              ? "Please type your name to sign this estimate as the contractor."
              : "Please type your name to sign this estimate."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Input
                id="signature"
                placeholder="Type your full name"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                autoComplete="name"
                disabled={isSubmitting}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !signature.trim()}>
              {isSubmitting ? "Signing..." : "Sign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};