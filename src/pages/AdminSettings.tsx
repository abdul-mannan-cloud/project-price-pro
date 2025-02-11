
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["cairlbrandon@gmail.com", "brandon@reliablepro.net"];
const KEYPAD_CODE = "123456"; // You might want to store this in a more secure way

export const AdminSettings = () => {
  const [code, setCode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthorization();
  }, []);

  const checkAuthorization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !ADMIN_EMAILS.includes(user.email || "")) {
        navigate("/settings");
        toast({
          title: "Unauthorized",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
      } else {
        setIsAuthorized(true);
      }
    } catch (error) {
      console.error("Error checking authorization:", error);
      navigate("/settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeypadInput = (digit: string) => {
    const newCode = code + digit;
    setCode(newCode);

    if (newCode.length === KEYPAD_CODE.length) {
      if (newCode === KEYPAD_CODE) {
        setIsAuthorized(true);
      } else {
        setCode("");
        toast({
          title: "Invalid Code",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleClear = () => setCode("");

  const handleBack = () => navigate("/settings");

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
            <p className="text-muted-foreground">Enter the admin code to continue</p>
          </div>
          
          <div className="bg-secondary p-4 rounded-lg text-center mb-6">
            <div className="text-2xl font-mono tracking-wider">
              {Array(KEYPAD_CODE.length).fill('•').map((dot, i) => (
                <span key={i} className={i < code.length ? 'text-primary' : 'text-muted-foreground'}>
                  {dot}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <Button
                key={num}
                variant="outline"
                className="h-16 text-xl"
                onClick={() => handleKeypadInput(num.toString())}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              className="h-16"
              onClick={handleClear}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="h-16 text-xl"
              onClick={() => handleKeypadInput("0")}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-16"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <Button variant="outline" onClick={handleBack}>Back to Settings</Button>
        </div>

        <div className="grid gap-6">
          {/* Add your admin settings sections here */}
          {/* For example: */}
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">Global Settings</h2>
            {/* Add admin controls */}
          </div>
          
          <div className="bg-card rounded-lg p-6 border">
            <h2 className="text-lg font-semibold mb-4">User Management</h2>
            {/* Add user management controls */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
