import { Button } from "@/components/ui/3d-button";
import { useNavigate } from "react-router-dom";

export function Header1() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate("/login");
  };

  const handleGetStarted = () => {
    navigate("/login", { state: { isSignUp: true } });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b">
      <div className="container relative mx-auto min-h-20 flex gap-4 flex-row lg:grid lg:grid-cols-3 items-center">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-2xl">
            Lovable
          </a>
          <nav className="hidden lg:flex items-center gap-6">
            <a
              href="#industries"
              className="text-sm font-medium hover:text-primary transition-colors"
            >
              Industries
            </a>
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
            onClick={() => navigate("/estimate")}
            variant="ghost"
            className="text-sm font-medium"
          >
            Try it, free
          </Button>
          <Button
            onClick={handleGetStarted}
            variant="default"
            className="text-sm font-medium"
          >
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
}
