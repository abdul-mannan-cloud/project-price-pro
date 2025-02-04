import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";
import { Database } from "@/integrations/supabase/types";

type EstimateData = {
  groups: Array<{
    name: string;
    description?: string;
    subgroups: Array<{
      name: string;
      items: Array<{
        title: string;
        description?: string;
        quantity: number;
        unit?: string;
        unitAmount: number;
        totalPrice: number;
      }>;
      subtotal: number;
    }>;
  }>;
};

type ContractorWithSettings = Database["public"]["Tables"]["contractors"]["Row"] & {
  contractor_settings: Database["public"]["Tables"]["contractor_settings"]["Row"];
};

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
            id,
            business_name,
            business_logo_url,
            contact_email,
            contact_phone,
            business_address,
            website,
            license_number,
            subscription_status,
            branding_colors,
            created_at,
            updated_at,
            contractor_settings (*)
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

  const estimateData = lead.estimate_data as EstimateData;
  const contractor = lead.contractors as ContractorWithSettings;

  if (!contractor || !contractor.contractor_settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Contractor Not Found</h1>
          <p className="text-muted-foreground">
            The contractor information for this estimate is not available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <EstimateDisplay
          groups={estimateData?.groups || []}
          totalCost={lead.estimated_cost || 0}
          projectSummary={lead.project_description}
          contractor={contractor}
        />
      </div>
    </div>
  );
};

export default PublicEstimate;