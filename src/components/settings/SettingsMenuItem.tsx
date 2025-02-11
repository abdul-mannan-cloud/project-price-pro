import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsMenuItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  isActive?: boolean;
}

export const SettingsMenuItem = ({ 
  icon, 
  title, 
  description,
  onClick,
  isActive = false 
}: SettingsMenuItemProps) => {
  const isMobile = useIsMobile();

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-center justify-between space-x-4 rounded-lg transition-colors relative
        ${isActive 
          ? 'bg-primary text-white after:absolute after:inset-y-0 after:start-0 after:-ms-1 after:w-0.5 after:bg-primary' 
          : 'hover:bg-primary hover:text-white'}`}
    >
      <div className="flex items-center space-x-4">
        <div className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-muted-foreground group-hover:text-white'}`}>
          {icon}
        </div>
        <div className="text-left">
          <h3 className="font-medium">{title}</h3>
        </div>
      </div>
      <ChevronRight className="h-4 w-4" />
    </button>
  );
};