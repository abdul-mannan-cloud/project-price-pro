import { Button } from "@/components/ui/3d-button";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export function Header1() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const navigationItems = [
    { label: "Get started", onClick: () => navigate('/estimate'), variant: "default" as const },
    { label: "Sign in", onClick: () => navigate('/login'), variant: "outline" as const },
    { label: "Sign up", onClick: () => navigate('/login?signup=true'), variant: "outline" as const }
  ];

  const NavigationButtons = () => (
    <div className="flex items-center gap-4">
      {navigationItems.map((item, index) => (
        <Button 
          key={index}
          variant={item.variant}
          size="lg"
          onClick={item.onClick}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b">
      <div className="flex items-center gap-6">
        <a href="/" className="flex items-center gap-2">
          <span className="font-semibold text-xl">Lovable</span>
        </a>
      </div>
      
      {isMobile ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
            <div className="flex flex-col gap-4 mt-8">
              {navigationItems.map((item, index) => (
                <Button 
                  key={index}
                  variant={item.variant}
                  size="lg"
                  onClick={item.onClick}
                  stretch
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <NavigationButtons />
      )}
    </header>
  );
}