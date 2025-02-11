
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EstimateDisplay } from "@/components/EstimateForm/EstimateDisplay";
import { LoadingScreen } from "@/components/EstimateForm/LoadingScreen";
import { Database } from "@/integrations/supabase/types";
import { useEffect } from "react";
import { BrandingColors } from "@/types/settings";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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

const DEFAULT_CONTRACTOR = {
  id: "098bcb69-99c6-445b-bf02-94dc7ef8c938",
  business_name: "Demo Contractor",
  contact_email: "demo@example.com",
  business_logo_url: null,
  contact_phone: null,
  business_address: null,
  website: null,
  license_number: null,
  subscription_status: "trial",
  branding_colors: {
    primary: "#6366F1",
    secondary: "#4F46E5"
  }
};

const PublicEstimate = () => {
  const { id } = useParams();
  const [isGeneratingEstimate, setIsGeneratingEstimate] = useState(false);
  const { toast } = useToast();

  const { data: lead, isLoading: isLeadLoading } = useQuery({
    queryKey: ["public-estimate", id],
    queryFn: async () => {
      console.log("Fetching lead data for ID:", id);
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

      if (error) {
        console.error("Error fetching lead:", error);
        throw error;
      }
      
      if (!data) {
        console.log("No lead found, using default values");
        return {
          id,
          contractor_id: DEFAULT_CONTRACTOR.id,
          estimate_data: null,
          estimated_cost: 0,
          project_title: "New Estimate",
          project_description: "",
          status: "pending",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      console.log("Lead data fetched:", data);

      // If the lead is in processing status and doesn't have estimate data yet,
      // trigger the estimate generation
      if (data.status === 'processing' && !data.estimate_data) {
        console.log("Starting estimate generation");
        setIsGeneratingEstimate(true);
        try {
          const { data: estimateData, error: estimateError } = await supabase.functions.invoke('generate-estimate', {
            body: { 
              projectDescription: data.project_description,
              answers: data.answers,
              contractorId: data.contractor_id,
              leadId: data.id,
              category: data.category
            }
          });

          if (estimateError) {
            console.error("Error generating estimate:", estimateError);
            throw estimateError;
          }
          
          console.log("Estimate generated successfully:", estimateData);
          // Update will happen via the backend, no need to manually update here
          return {
            ...data,
            estimate_data: estimateData,
            status: 'complete'
          };
        } catch (error) {
          console.error('Error generating estimate:', error);
          toast({
            title: "Error",
            description: "Failed to generate estimate. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsGeneratingEstimate(false);
        }
      }

      return data;
    },
  });

  // Ensure contractor exists before querying it
  const { data: contractor, isLoading: isContractorLoading } = useQuery({
    queryKey: ["contractor", lead?.contractor_id || DEFAULT_CONTRACTOR.id],
    queryFn: async () => {
      const contractorId = lead?.contractor_id || DEFAULT_CONTRACTOR.id;
      console.log("Fetching contractor data for ID:", contractorId);
      
      // First try to get the existing contractor
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          contractor_settings (*)
        `)
        .eq("id", contractorId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching contractor:", error);
        throw error;
      }

      // If no contractor exists and we're using the default ID, create it
      if (!data && contractorId === DEFAULT_CONTRACTOR.id) {
        console.log("Creating default contractor");
        const { data: newContractor, error: createError } = await supabase
          .from("contractors")
          .insert({
            ...DEFAULT_CONTRACTOR
          })
          .select(`
            *,
            contractor_settings (*)
          `)
          .single();

        if (createError) {
          console.error("Error creating default contractor:", createError);
          throw createError;
        }

        return newContractor as ContractorWithSettings;
      }

      if (!data) {
        console.error("No contractor found for ID:", contractorId);
        throw new Error("Contractor not found");
      }

      console.log("Contractor data fetched:", data);
      return data as ContractorWithSettings;
    },
    enabled: !!lead,
    staleTime: 5 * 60 * 1000,
  });

  // Apply branding colors when contractor data is loaded
  useEffect(() => {
    if (contractor?.branding_colors) {
      const colors = contractor.branding_colors as BrandingColors;
      
      // Apply primary color and its variations
      document.documentElement.style.setProperty('--primary', colors.primary);
      document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');

      // Convert hex to RGB for creating variations
      const primaryHex = colors.primary.replace('#', '');
      const r = parseInt(primaryHex.slice(0, 2), 16);
      const g = parseInt(primaryHex.slice(2, 4), 16);
      const b = parseInt(primaryHex.slice(4, 6), 16);

      // Set all primary color variations
      document.documentElement.style.setProperty('--primary-100', `rgba(${r}, ${g}, ${b}, 0.1)`);
      document.documentElement.style.setProperty('--primary-200', `rgba(${r}, ${g}, ${b}, 0.2)`);
      document.documentElement.style.setProperty('--primary-300', `rgba(${r}, ${g}, ${b}, 0.4)`);
      document.documentElement.style.setProperty('--primary-400', `rgba(${r}, ${g}, ${b}, 0.6)`);
      document.documentElement.style.setProperty('--primary-500', `rgba(${r}, ${g}, ${b}, 0.8)`);
      document.documentElement.style.setProperty('--primary-600', colors.primary);
      document.documentElement.style.setProperty('--primary-700', `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`);

      // Set secondary color
      document.documentElement.style.setProperty('--secondary', colors.secondary);
      document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');
    }
  }, [contractor]);

  if (isLeadLoading || isGeneratingEstimate) {
    return <LoadingScreen message="Generating your estimate..." isEstimate={true} />;
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
