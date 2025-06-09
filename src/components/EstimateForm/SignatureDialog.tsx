import React, { useState, useEffect } from "react";
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
  isContractorSignature?: boolean;
  contractorName?: string;
  clientName?: string;
}

export const SignatureDialog = ({
  isOpen,
  onClose,
  onSign,
  contractorId,
  leadId,
  estimateData,
  isContractorSignature = false,
}: SignatureDialogProps) => {
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);  

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Failed to fetch user:", error.message);
        return;
      }

      console.log(user);
      

      const userName =
        user?.user_metadata?.first_name || "";

       setSignature(userName);
    };

    const fetchLead = async () => {
      const {
        data: lead,
        error,
      } = await supabase.from("leads").select("*").eq("id", leadId).single();

      if (error) {
        console.error("Failed to fetch user:", error.message);
        return;
      }

      console.log(lead.user_name);
      

      const userName = lead.user_name || ""
       setSignature(userName);
    };

    if (isOpen && isContractorSignature) {
      fetchUser();
    } else {
      fetchLead()
    }
  }, [isOpen]);

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
      if (leadId && contractorId) {
        const updatePayload = isContractorSignature
          ? {
              contractor_signature: signature,
              contractor_signature_date: new Date().toISOString(),
              status: "approved",
            }
          : {
              client_signature: signature,
              client_signature_date: new Date().toISOString(),
              status: "in-progress",
            };

        const { error: dbError } = await supabase
          .from("leads")
          .update(updatePayload)
          .eq("id", leadId);

        if (dbError) throw dbError;

        toast({
          title: "Success",
          description: isContractorSignature
            ? "Contractor signature added successfully."
            : "Client signature added successfully.",
        });
      }

      onSign(signature);
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
