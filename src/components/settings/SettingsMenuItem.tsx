import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";

interface SettingsMenuItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}

export const SettingsMenuItem = ({ icon, title, description, onClick }: SettingsMenuItemProps) => {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 flex items-start space-x-4 hover:bg-accent rounded-lg transition-colors"
    >
      <div className="flex-shrink-0 mt-1">
        {icon}
      </div>
      <div className="flex-grow text-left">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="flex-shrink-0 h-5 w-5 mt-1 text-muted-foreground" />
    </button>
  );
};