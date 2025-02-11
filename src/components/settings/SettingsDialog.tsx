
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsDialogProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const SettingsDialog = ({ title, description, isOpen, onClose, children }: SettingsDialogProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`
        ${isMobile ? 'w-screen h-screen max-w-none rounded-none p-0' : 'max-w-2xl sm:max-w-[600px] h-[80vh]'}
        flex flex-col
      `}>
        <DialogHeader className={`
          flex flex-row items-center justify-between
          ${isMobile ? 'px-4 py-3 border-b' : ''}
        `}>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </DialogHeader>
        <div className={`
          flex-1 overflow-y-auto
          ${isMobile ? 'p-4' : ''}
        `}>
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
};
