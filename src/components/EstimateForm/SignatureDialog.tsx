// src/components/EstimateForm/SignatureDialog.tsx
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
import { toast } from "@/hooks/use-toast";
import { saveSignature, type Signer } from "@/api/signatures";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** tells the parent to refresh */
  onSign: (sig: string) => void;
  leadId: string;
  /** true ⇒ contractor is signing – otherwise client */
  isContractorSignature?: boolean;
}

export function SignatureDialog({
  isOpen,
  onClose,
  onSign,
  leadId,
  isContractorSignature = false,
}: Props) {
  const [signature, setSignature] = useState("");
  const [saving, setSaving] = useState(false);

  /** submit form */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sig = signature.trim();
    if (!sig) return;

    try {
      setSaving(true);

      // 🔑 SINGLE helper keeps `lead_signatures` and legacy columns in sync
      await saveSignature(
        leadId,
        sig,
        isContractorSignature ? ("contractor" as Signer) : ("client" as Signer),
      );

      toast({ title: "Signature saved" });
      onSign(sig);        // optimistic refresh for parent
      setSignature("");
      onClose();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isContractorSignature ? "Contractor Signature" : "Client Signature"}
          </DialogTitle>
          <DialogDescription>Type your full name.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Input
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="Full name"
            disabled={saving}
            required
            className="mb-4"
          />

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !signature.trim()}>
              {saving ? "Saving…" : "Sign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
