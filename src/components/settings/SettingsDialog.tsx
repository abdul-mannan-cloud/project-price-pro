import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "../../hooks/useMediaQuery.tsx";

interface SettingsDialogProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const SettingsDialog = ({
  title,
  description,
  isOpen,
  onClose,
  children,
}: SettingsDialogProps) => {
  const isMobile = useMediaQuery("(max-width: 640px)");

  // Force cleanup of any event listeners when component unmounts or dialog closes
  useEffect(() => {
    // Only add this listener when the dialog is open
    if (isOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }
      };

      // Add global escape key listener
      window.addEventListener("keydown", handleEscape);

      // Force body to be scrollable again
      document.body.style.overflow = "auto";
      document.body.style.pointerEvents = "auto";

      // Cleanup function
      return () => {
        window.removeEventListener("keydown", handleEscape);

        // Small delay to ensure React finishes its updates first
        setTimeout(() => {
          document.body.style.overflow = "auto";
          document.body.style.pointerEvents = "auto";

          // Force remove any potential overlay elements that might be stuck
          const overlays = document.querySelectorAll("[data-radix-portal]");
          overlays.forEach((overlay) => {
            if (overlay.childElementCount === 0) {
              overlay.remove();
            }
          });
        }, 100);
      };
    }
  }, [isOpen, onClose]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();

        // Fix for stuck overlays and event handlers
        if (!open) {
          setTimeout(() => {
            document.body.style.overflow = "auto";
            document.body.style.pointerEvents = "auto";
          }, 100);
        }
      }}
    >
      <DialogContent
        className={`
        ${isMobile ? "w-screen h-screen max-w-none rounded-none p-0" : "max-w-2xl sm:max-w-[600px] h-[80vh]"}
        flex flex-col overflow-hidden
      `}
        onPointerDownOutside={(e) => {
          // Prevent propagation to avoid stuck events
          e.preventDefault();
        }}
        onFocusOutside={(e) => {
          // Prevent propagation to avoid stuck events
          e.preventDefault();
        }}
      >
        <DialogHeader
          className={`
          flex flex-row items-center justify-between
          ${isMobile ? "px-4 py-3 border-b" : ""}
        `}
        >
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div
          className={`
          flex-1 overflow-y-auto
          ${isMobile ? "p-4" : ""}
        `}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
