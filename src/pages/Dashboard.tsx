import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, Settings, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const handlePreviewClick = () => {
    const estimatorUrl = `/estimate/${contractor.id}`;
    navigate(estimatorUrl);
  };

  const handleCopyLink = async () => {
    const estimatorUrl = `${window.location.origin}/estimate/${contractor.id}`;
    try {
      await navigator.clipboard.writeText(estimatorUrl);
      toast({
        title: "Link copied!",
        description: "The estimator link has been copied to your clipboard.",
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the link manually.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-600 to-indigo-600 pb-24">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        {/* Hero Section */}
        <header className="mb-8 text-center text-white">
          <h1 className="text-4xl font-bold drop-shadow-lg">
            Welcome, {contractor.name || "Contractor"}!
          </h1>
          <p className="mt-2 text-lg italic">Let's build something amazing today.</p>
        </header>
        
        {/* Action Buttons */}
        <div className="flex justify-end mb-6 gap-4">
          <Button 
            onClick={handleCopyLink}
            className="gap-2"
            variant="outline"
          >
            <Copy className="w-4 h-4" />
            Copy Link
          </Button>
          <Button 
            onClick={handlePreviewClick}
            className="gap-2"
          >
            Preview Estimator
          </Button>
        </div>
        
        {/* Stat Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 bg-white rounded-xl shadow-lg transform transition duration-500 hover:scale-105">
            <h2 className="text-xl font-bold mb-2">Total Leads</h2>
            <p className="text-3xl font-extrabold text-indigo-600">23</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-lg transform transition duration-500 hover:scale-105">
            <h2 className="text-xl font-bold mb-2">Active Projects</h2>
            <p className="text-3xl font-extrabold text-green-600">5</p>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-lg transform transition duration-500 hover:scale-105">
            <h2 className="text-xl font-bold mb-2">Pending Approvals</h2>
            <p className="text-3xl font-extrabold text-red-600">2</p>
          </div>
        </section>
        
        {/* Recent Activity Feed */}
        <section className="mt-12 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <ul className="space-y-4">
            <li className="flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-full mr-4"></span>
              <span>New lead generated for Project <strong>X</strong>.</span>
            </li>
            <li className="flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-full mr-4"></span>
              <span>Profile updated successfully.</span>
            </li>
            <li className="flex items-center">
              <span className="w-3 h-3 bg-yellow-500 rounded-full mr-4"></span>
              <span>Pending approval for invoice <strong>#456</strong>.</span>
            </li>
          </ul>
        </section>

        {/* Performance Overview / Chart Placeholder */}
        <section className="mt-12 bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Performance Overview</h2>
          <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded-lg animate-pulse">
            <span className="text-gray-500">Chart Coming Soon...</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
