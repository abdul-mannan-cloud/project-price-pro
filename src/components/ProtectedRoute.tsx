import { Navigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Spinner from "@/components/ui/spinner";

const ProtectedRoute = () => {
  // Get current session
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });
    // If we have a session, check if contractor is verified and get tier
  const { data: contractor, isLoading: contractorLoading } = useQuery({
    queryKey: ["contractor-verification", session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select("verified, tier")
        .eq("user_id", session!.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching contractor verification status:", error);
        return null;
      }

      return data;
    },
  });

  // If no session, redirect to login
  if (!sessionLoading && !session) {
    return <Navigate to="/login" replace />;
  }



  // Show loading spinner while checking authentication and verification
  if (sessionLoading || contractorLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // If contractor not found or no data
  if (!contractor) {
    return <Navigate to="/onboarding" replace />;
  }

  // If contractor is not verified, redirect based on tier
  if (contractor.verified === false) {
    // Enterprise tier goes to verification page
    if (contractor.tier === "enterprise") {
      return <Navigate to="/verification" replace />;
    }
    // Other tiers go to onboarding
    else {
      return <Navigate to="/onboarding" replace />;
    }
  }

  // If authenticated and verified, render the protected route
  return <Outlet />;
};

export default ProtectedRoute;