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

const DEFAULT_CONTRACTOR_ID = "098bcb69-99c6-445b-bf02-94dc7ef8c938";

const PublicEstimate = () => {
  const { id } = useParams();

  const { data: lead } = useQuery({
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
        .maybeSingle();

      if (error || !data) {
        return {
          id,
          contractor_id: DEFAULT_CONTRACTOR_ID,
          estimate_data: null,
          estimated_cost: 0,
          project_title: "New Estimate",
          project_description: "",
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      return data;
    },
  });

  const { data: contractor, isLoading: isContractorLoading } = useQuery({
    queryKey: ["contractor", lead?.contractor_id || DEFAULT_CONTRACTOR_ID],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          contractor_settings (*)
        `)
        .eq("id", lead?.contractor_id || DEFAULT_CONTRACTOR_ID)
        .single();

      if (error) {
        // If the specified contractor is not found, try to fetch the default contractor
        if (lead?.contractor_id !== DEFAULT_CONTRACTOR_ID) {
          const { data: defaultData, error: defaultError } = await supabase
            .from("contractors")
            .select(`
              *,
              contractor_settings (*)
            `)
            .eq("id", DEFAULT_CONTRACTOR_ID)
            .single();

          if (defaultError) throw defaultError;
          return defaultData;
        }
        throw error;
      }

      return data as ContractorWithSettings;
    },
    enabled: !!lead,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isContractorLoading) {
    return <LoadingScreen message="Loading estimate..." />;
  }

  if (!contractor) {
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

  const estimateData = lead?.estimate_data as EstimateData;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <EstimateDisplay
          groups={estimateData?.groups || []}
          totalCost={lead?.estimated_cost || 0}
          projectSummary={lead?.project_description}
          contractor={{
            business_name: contractor?.business_name,
            business_logo_url: contractor?.business_logo_url || undefined,
            branding_colors: contractor?.branding_colors as { primary: string; secondary: string } || undefined
          }}
        />
      </div>
    </div>
  );
};

export default PublicEstimate;
