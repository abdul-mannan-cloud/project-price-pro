import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, Settings, Copy, LineChart, FileText, Bell, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings }
  ];

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
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

      if (error) throw error;
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

  if (!contractor) return null;

  const totalLeads = leads.length;
  const totalEstimatedValue = leads.reduce((sum, lead) => sum + (lead.estimated_cost || 0), 0);
  const averageEstimate = totalLeads > 0 ? totalEstimatedValue / totalLeads : 0;

  const features = [
    {
      Icon: FileText,
      name: "Total Leads",
      description: `You have ${totalLeads} leads in your pipeline`,
      href: "/leads",
      cta: "View all leads",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
    },
    {
      Icon: LineChart,
      name: "Total Value",
      description: `Total estimated value: $${totalEstimatedValue.toLocaleString()}`,
      href: "/leads",
      cta: "View details",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-start-2 lg:col-end-3 lg:row-start-1 lg:row-end-4",
    },
    {
      Icon: Calendar,
      name: "Average Estimate",
      description: `Average estimate value: $${averageEstimate.toLocaleString()}`,
      href: "/leads",
      cta: "Learn more",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
    },
    {
      Icon: Bell,
      name: "Recent Activity",
      description: "View your most recent leads and estimates",
      href: "/leads",
      cta: "View activity",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-start-3 lg:col-end-4 lg:row-start-1 lg:row-end-4",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Welcome, {contractor.business_name}</h1>
          <div className="flex gap-4">
            <Button 
              onClick={() => {
                const estimatorUrl = `${window.location.origin}/estimate/${contractor.id}`;
                navigator.clipboard.writeText(estimatorUrl);
                toast({
                  title: "Link copied!",
                  description: "The estimator link has been copied to your clipboard.",
                });
              }}
              className="gap-2"
              variant="outline"
            >
              <Copy className="w-4 h-4" />
              Copy Link
            </Button>
            <Button 
              onClick={() => navigate(`/estimate/${contractor.id}`)}
              className="gap-2"
            >
              Preview Estimator
            </Button>
          </div>
        </div>

        <BentoGrid className="lg:grid-rows-3">
          {features.map((feature) => (
            <BentoCard key={feature.name} {...feature} />
          ))}
        </BentoGrid>
      </div>
    </div>
  );
};

export default Dashboard;