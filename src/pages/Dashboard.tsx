
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [contractorId, setContractorId] = useState<string | null>(null);

  useEffect(() => {
    const fetchContractorId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Get contractor ID from contractors table
        const { data: contractor, error } = await supabase
          .from('contractors')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        if (!contractor) {
          navigate('/onboarding');
          return;
        }

        setContractorId(contractor.id);
      } catch (error) {
        console.error('Error fetching contractor:', error);
        toast({
          title: "Error",
          description: "Failed to load contractor information",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContractorId();
  }, []);

  const handleGenerateEstimate = async () => {
    if (!contractorId) {
      toast({
        title: "Error",
        description: "Contractor ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .insert({
          project_title: "New Estimate",
          status: 'pending',
          contractor_id: contractorId  // Set the contractor_id here
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Generate estimate with explicit contractor ID
      const { error: estimateError } = await supabase.functions.invoke('generate-estimate', {
        body: { 
          leadId: lead.id,
          contractorId: contractorId, // Pass contractor_id explicitly
          projectDescription: "New estimate"
        }
      });

      if (estimateError) throw estimateError;

      navigate(`/estimate/${lead.id}`);
    } catch (error) {
      console.error('Error generating estimate:', error);
      toast({
        title: "Error",
        description: "Failed to generate estimate. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <Button onClick={handleGenerateEstimate}>
        Generate New Estimate
      </Button>
    </div>
  );
};

export default Dashboard;
