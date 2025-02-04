import { Button } from "@/components/ui/3d-button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const industryOptions = [
  "Flooring Installation",
  "Fence Installation",
  "Painting",
  "Major Renovation",
  "Landscaping",
  "Electrician",
  "Plumber",
  "Door Installation",
  "Concrete Work",
  "Repairs",
  "Carpentry",
  "Deck & Porch",
  "Moving Services",
  "Drywall",
  "Demolition",
  "Mold Remediation",
  "Kitchen Remodel",
  "Security System",
];

export function Header1() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate("/login");
  };

  const handleGetStarted = () => {
    navigate("/login", { state: { isSignUp: true } });
  };

  const handleEstimate = () => {
    navigate("/estimate");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container relative mx-auto min-h-20 flex gap-4 flex-row lg:grid lg:grid-cols-3 items-center">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-2xl">
            Lovable
          </a>
          <nav className="hidden lg:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors">
                Industries
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuGroup>
                  {industryOptions.map((industry) => (
                    <DropdownMenuItem key={industry}>
                      {industry}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <a
              href="#features"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Pricing
            </a>
          </nav>
        </div>
        <div className="hidden lg:flex justify-center">
          {/* Center section - can be used for search or other content */}
        </div>
        <div className="flex items-center justify-end gap-4 ml-auto lg:ml-0">
          <Button
            variant="ghost"
            onClick={handleSignIn}
            className="text-sm font-medium"
          >
            Sign In
          </Button>
          <Button
            onClick={handleEstimate}
            variant="ghost"
            className="text-sm font-medium"
          >
            Try it, free
          </Button>
          <Button
            onClick={handleGetStarted}
            variant="ai"
            className="text-sm font-medium"
          >
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}