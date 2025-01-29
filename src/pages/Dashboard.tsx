import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import { LeadMagnetPreview } from "@/components/LeadMagnet/LeadMagnetPreview";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const navItems = [
    { 
      name: "Dashboard", 
      url: "/dashboard", 
      icon: LayoutDashboard 
    },
    { 
      name: "Leads", 
      url: "/leads", 
      icon: Users 
    },
    { 
      name: "Settings", 
      url: "/settings", 
      icon: Settings 
    }
  ];

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        toast({
          title: "Authentication error",
          description: "Please try signing in again",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }

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

      if (error) {
        console.error('Contractor fetch error:', error);
        throw error;
      }
      
      if (!data) {
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
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <LeadMagnetPreview />
      </div>
    </div>
  );
};

export default Dashboard;