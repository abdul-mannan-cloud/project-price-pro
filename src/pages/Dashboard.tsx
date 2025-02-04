import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { LayoutDashboard, Users, Settings, Copy, LineChart, FileText, Bell, History, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings }
  ];

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

  const features = [
    {
      Icon: Copy,
      name: "Preview Estimator",
      description: "Preview your estimator or copy the link to share",
      href: `/estimate/${contractor.id}`,
      cta: "Preview",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-span-3 bg-primary text-white hover:scale-[1.02] transition-transform",
      detailContent: (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Estimator Preview</h3>
          <p>View your estimator as your clients will see it, or copy the link to share.</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => window.open(`/estimate/${contractor.id}`, '_blank')}>
              Open Preview
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                const estimatorUrl = `${window.location.origin}/estimate/${contractor.id}`;
                navigator.clipboard.writeText(estimatorUrl);
                toast({
                  title: "Link copied!",
                  description: "The estimator link has been copied to your clipboard.",
                });
              }}
            >
              Copy Link
            </Button>
          </div>
        </div>
      ),
      actions: (
        <div className="flex gap-2 mt-2">
          <Button 
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              const estimatorUrl = `${window.location.origin}/estimate/${contractor.id}`;
              navigator.clipboard.writeText(estimatorUrl);
              toast({
                title: "Link copied!",
                description: "The estimator link has been copied to your clipboard.",
              });
            }}
            className="text-white hover:text-primary"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>
      ),
    },
    {
      Icon: FileText,
      name: "Total Leads",
      description: `You have ${totalLeads} leads in your pipeline`,
      href: "/leads",
      cta: "View all leads",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-span-1 hover:scale-[1.02] transition-transform",
      detailContent: (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Lead Summary</h3>
          <p>Quick overview of your leads pipeline</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Total Leads:</span>
              <span className="font-semibold">{totalLeads}</span>
            </div>
            <Button onClick={() => navigate('/leads')} className="w-full">
              View All Leads
            </Button>
          </div>
        </div>
      ),
    },
    {
      Icon: LineChart,
      name: "Total Value",
      description: `Total estimated value: $${totalEstimatedValue.toLocaleString()}`,
      href: "/leads",
      cta: "View details",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-span-1 hover:scale-[1.02] transition-transform",
      detailContent: (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Pipeline Value</h3>
          <p>Total value of all leads in your pipeline</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Total Value:</span>
              <span className="font-semibold">${totalEstimatedValue.toLocaleString()}</span>
            </div>
            <Button onClick={() => navigate('/leads')} className="w-full">
              View Details
            </Button>
          </div>
        </div>
      ),
    },
    {
      Icon: History,
      name: "Recent Activity",
      description: "Latest updates and notifications",
      href: "/leads",
      cta: "View all",
      background: <div className="absolute -right-20 -top-20 opacity-60" />,
      className: "lg:col-span-1 hover:scale-[1.02] transition-transform",
      detailContent: (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Recent Activity</h3>
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center gap-2 text-sm">
                <Bell className="w-4 h-4 text-primary" />
                <span>{lead.project_title}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => navigate('/leads')} className="w-full">
            View All Activity
          </Button>
        </div>
      ),
      content: (
        <div className="mt-4 space-y-3">
          {leads.slice(0, 3).map((lead) => (
            <div key={lead.id} className="flex items-center gap-2 text-sm text-gray-600">
              <Bell className="w-4 h-4" />
              <span>New lead: {lead.project_title}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] pb-24">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold">Welcome, {contractor.business_name}</h1>
        </div>

        <BentoGrid className={`grid-cols-1 md:grid-cols-3 gap-4 ${isMobile ? 'auto-rows-[16rem]' : ''}`}>
          {features.map((feature) => (
            <BentoCard 
              key={feature.name} 
              {...feature} 
              onClick={() => setSelectedFeature(feature.name)}
              showActions={isMobile}
              actionIcon={<ChevronRight className="w-4 h-4" />}
            />
          ))}
        </BentoGrid>

        <Dialog open={!!selectedFeature} onOpenChange={() => setSelectedFeature(null)}>
          <DialogContent className="sm:max-w-[600px]">
            {features.find(f => f.name === selectedFeature)?.detailContent}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;