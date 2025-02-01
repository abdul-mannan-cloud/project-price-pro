import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, Settings, Copy, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  // Fetch contractor data
  const { data: contractor, isLoading } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_settings(*)")
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

  // Fetch leads data
  const { data: leads = [] } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contractor,
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

  const totalLeads = leads.length;
  const totalEstimatedValue = leads.reduce((sum, lead) => sum + (lead.estimated_cost || 0), 0);
  const averageEstimate = totalLeads > 0 ? totalEstimatedValue / totalLeads : 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Welcome, {contractor.business_name}</h1>
          <div className="flex gap-4">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-semibold">{totalLeads}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <LineChart className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Estimated Value</p>
                <p className="text-2xl font-semibold">${totalEstimatedValue.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Settings className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Average Estimate</p>
                <p className="text-2xl font-semibold">${averageEstimate.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </div>

        {leads.length > 0 && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Recent Leads</h2>
            <div className="space-y-4">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex justify-between items-center p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium">{lead.user_name || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground">{lead.category}</p>
                  </div>
                  <p className="font-semibold">${lead.estimated_cost?.toLocaleString() || 0}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;