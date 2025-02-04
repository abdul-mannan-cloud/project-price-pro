import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";

const PublicEstimate = () => {
  const { id } = useParams();

  const { data: lead, isLoading } = useQuery({
    queryKey: ["public-estimate", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select(`
          *,
          contractors (
            business_name,
            business_logo_url,
            contact_email,
            contact_phone,
            business_address,
            website,
            license_number
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Loading estimate..." />;
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Estimate Not Found</h1>
          <p className="text-muted-foreground">
            The estimate you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <EstimateDisplay
          groups={lead.estimate_data?.groups || []}
          totalCost={lead.estimated_cost || 0}
          projectSummary={lead.project_description}
          contractor={lead.contractors}
        />
      </div>
    </div>
  );
};

export default PublicEstimate;