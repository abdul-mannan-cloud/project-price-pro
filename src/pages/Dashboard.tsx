import TopMenu from "@/components/TopMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to access the dashboard",
          variant: "destructive",
        });
        navigate("/login");
      }
    };
    checkAuth();
  }, [navigate, toast]);

  const { data: contractor, isLoading } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        // If no contractor data is found, redirect to onboarding
        navigate("/onboarding");
        return null;
      }
      
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!contractor) {
    return null; // Will redirect in the query function
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <TopMenu />
      <div className="container mx-auto py-8">
        <div className="bg-white rounded-2xl border border-[#d2d2d7] shadow-sm p-8">
          <h1 className="text-2xl font-semibold mb-6">
            Welcome, {contractor.business_name}
          </h1>
          <div className="space-y-4">
            <p className="text-[#86868b]">
              This is your dashboard where you can manage your business information,
              view leads, and access settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;