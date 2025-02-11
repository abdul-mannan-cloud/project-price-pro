import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Header1() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
      <div className="container mx-auto">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="text-foreground hover:bg-transparent hover:text-primary"
              onClick={() => navigate("/")}
            >
              Lovable
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {!isLoggedIn && (
              <>
                <Button 
                  variant="ghost"
                  className="text-foreground hover:bg-transparent hover:text-primary"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
                <Button 
                  variant="ghost"
                  className="text-foreground hover:bg-transparent hover:text-primary"
                  onClick={() => navigate("/estimate")}
                >
                  Get Started
                </Button>
              </>
            )}
            {isLoggedIn && (
              <Button 
                variant="ghost"
                className="text-foreground hover:bg-transparent hover:text-primary"
                onClick={() => navigate("/dashboard")}
              >
                Dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}