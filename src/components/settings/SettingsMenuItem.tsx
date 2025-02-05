import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

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
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 flex items-start space-x-4 hover:bg-accent rounded-lg transition-colors relative
        ${isActive ? 'after:absolute after:inset-y-0 after:start-0 after:-ms-1 after:w-0.5 after:bg-primary' : ''}`}
    >
      <div className="flex-shrink-0 mt-1 text-muted-foreground">
        {icon}
      </div>
      <div className="flex-grow text-left">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
};