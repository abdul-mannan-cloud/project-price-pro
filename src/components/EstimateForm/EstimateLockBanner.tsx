// src/components/EstimateForm/EstimateLockBanner.tsx

import React from "react";
import { LockIcon, UnlockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EstimateLockBannerProps {
  isLocked: boolean;
  onUnlock: () => void;
  className?: string;
}

export const EstimateLockBanner: React.FC<EstimateLockBannerProps> = ({
  isLocked,
  onUnlock,
  className,
}) => {
  if (!isLocked) return null;

  return (
    <div
      className={cn(
        "bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 flex justify-between items-center",
        className,
      )}
    >
      <div className="flex items-center">
        <LockIcon className="text-amber-500 mr-3 h-5 w-5" />
        <div>
          <p className="text-amber-800 font-medium">This estimate is locked</p>
          <p className="text-amber-700 text-sm">
            The client has signed this estimate. You need to unlock it before
            making changes.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="bg-white border-amber-500 text-amber-700 hover:bg-amber-50"
        onClick={onUnlock}
      >
        <UnlockIcon className="mr-2 h-4 w-4" />
        Unlock Estimate
      </Button>
    </div>
  );
};

interface UnlockConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UnlockConfirmDialog: React.FC<UnlockConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlock Signed Estimate?</AlertDialogTitle>
          <AlertDialogDescription>
            This estimate has been signed by the client. Unlocking it will allow
            you to make changes, but the client will need to sign it again. Are
            you sure you want to proceed?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Unlock Estimate
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
