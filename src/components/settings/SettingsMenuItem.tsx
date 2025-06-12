import { ChevronRight } from "lucide-react";
import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsMenuItemProps {
  icon: ReactNode;
  title: string;
  description: string;
  handleSectionChange: (section: string) => void;
  isActive?: boolean;
  access: boolean;
  section: string
}

export const SettingsMenuItem = ({ 
  icon, 
  title, 
  description,
  handleSectionChange,
  isActive = false,
  access,
  section
}: SettingsMenuItemProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="relative">
  {/* Upgrade link OUTSIDE the button */}
  {
    !access &&
    <div
      className="text-xs absolute top-[22%] right-[20%] text-green-500 hover:font-bold hover:bg-green-500 hover:text-white transition-all duration-500 p-2 rounded-full cursor-pointer z-10"
      onClick={() => {
        handleSectionChange("subscription")
      }}
    >
      Upgrade
    </div>
  }

  {/* Button below */}
  <button
    disabled={!access}
    onClick={() => handleSectionChange(section)}
    className={`w-full p-4 flex items-center justify-between space-x-4 rounded-lg transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed
      ${isActive 
        ? 'bg-primary text-white after:absolute after:inset-y-0 after:start-0 after:-ms-1 after:w-0.5 after:bg-primary' 
        : `${access && 'hover:bg-primary hover:text-white'}`}`}
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
</div>

  );
};