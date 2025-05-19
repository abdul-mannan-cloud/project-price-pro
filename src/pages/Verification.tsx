import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconAlertTriangle } from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Verification = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Check contractor verification status again in case it changed
      const { data: contractor } = await supabase
        .from("contractors")
        .select("verified, tier")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // If verified or not enterprise tier, redirect appropriately
      if (contractor) {
        if (contractor.verified) {
          navigate("/dashboard");
        } else if (contractor.tier !== "enterprise") {
          navigate("/onboarding");
        }
      }
    };

    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleSwitchToPioneer = () => {
    // Logic to switch to Pioneer plan
    // This could involve updating the user's tier in the database
    // and redirecting them to the appropriate page.
    navigate("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-xl shadow-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <IconAlertTriangle size={48} className="text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Hang Tight — We're On It!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center text-gray-700">
            <p className="mb-4">
              We got your request for the Unlimited Enterprise plan, and an Estimatrix team member has been notified. We’ll be in touch within 1–2 business days to get everything set up for you.
            </p>
            <p className="mb-4">
              In the meantime, why not jump in with the Pioneer Plan and enjoy $1,000 in free credits while you wait? It's on us!
            </p>
            <p>
              Got questions? Just give us a shout at{" "}
              <a href="support@estimatrix.io" className="text-blue-600 hover:underline">
                support@estimatrix.io 
              </a>
               {" "}— we’ve got your back.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200 flex flex-col gap-2">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSwitchToPioneer}
            >
              Switch to Pioneer
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleSignOut}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Verification;