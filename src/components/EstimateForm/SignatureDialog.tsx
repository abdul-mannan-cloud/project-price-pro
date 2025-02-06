
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

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (initials: string) => void;
}

export const SignatureDialog = ({ isOpen, onClose, onComplete }: SignatureDialogProps) => {
  const [initials, setInitials] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (initials.trim()) {
      onComplete(initials);
      onClose();
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
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Sign Estimate</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
