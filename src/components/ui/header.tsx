import { Button } from "@/components/ui/3d-button";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";

export function Header1() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const textLinks = [
    { label: "Pricing", onClick: () => navigate('/pricing') },
    { label: "Industries", onClick: () => navigate('/industries') },
  ];

  const navigationItems = [
    { label: "Sign in", onClick: () => navigate('/login'), variant: "outline" as const },
    { label: "Sign up", onClick: () => navigate('/login?signup=true'), variant: "outline" as const },
    { label: "Get started", onClick: () => navigate('/estimate'), variant: "default" as const },
  ];

  const NavigationButtons = () => (
    <div className="flex items-center">
      {/* Text Links - Now left-aligned */}
      <div className="flex items-center gap-6 mr-8">
        {textLinks.map((link, index) => (
          <button
            key={index}
            onClick={link.onClick}
            className="text-left text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            {link.label}
          </button>
        ))}
      </div>

      {/* Auth Buttons */}
      <div className="flex items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost"
            size="lg"
            onClick={() => navigate('/login')}
          >
            Sign in
          </Button>
          <Button 
            variant="ghost"
            size="lg"
            onClick={() => navigate('/login?signup=true')}
          >
            Sign up
          </Button>
        </div>
        
        <Separator orientation="vertical" className="mx-6 h-6" />
        
        <Button 
          variant="ai"
          size="lg"
          onClick={() => navigate('/estimate')}
        >
          Get started
        </Button>
      </div>
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
              {textLinks.map((link, index) => (
                <Button 
                  key={index}
                  variant="ghost"
                  size="lg"
                  onClick={link.onClick}
                  stretch
                >
                  {link.label}
                </Button>
              ))}
              <Separator className="my-2" />
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