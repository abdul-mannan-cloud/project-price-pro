
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";
import Spinner from "../ui/spinner";

type ContractorSettings = Database["public"]["Tables"]["contractor_settings"]["Row"];

export const ServiceCategoriesSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available options/categories
  const { data: optionsCategories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Options")
        .select("*")
        .single();
      
      if (error) throw error;
      
      // Transform the Options row into an array of categories
      const categories = Object.entries(data)
        .filter(([key]) => key !== "Key Options") // Exclude the primary key
        .map(([name]) => ({
          id: name,
          name: name,
          description: `Projects related to ${name.toLowerCase()}`
        }));
      
      return categories;
    }
  });

  // Fetch contractor settings to get excluded categories
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["contractor_settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const contractor_id = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", contractor_id.data.id)
        .single();

      if (error) throw error;
      return data as ContractorSettings;
    }
  });

  // Update excluded categories mutation
  const updateExcludedCategories = useMutation({
    mutationFn: async (excludedCategories: string[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const contractor_id = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      const { error } = await supabase
        .from("contractor_settings")
        .update({ excluded_categories: excludedCategories })
        .eq("id", contractor_id.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractor_settings"] });
      toast({
        title: "Settings saved",
        description: "Your service categories have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating categories:", error);
    }
  });

  if (categoriesLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-full">
        <Spinner />
        {/* <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> */}
        {/* <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span> */}
      </div>
    );
  }

  const excludedCategories = settings?.excluded_categories || [];

  const handleCategoryToggle = (categoryId: string, isEnabled: boolean) => {
    const newExcludedCategories = isEnabled
      ? excludedCategories.filter(id => id !== categoryId)
      : [...excludedCategories, categoryId];
    
    updateExcludedCategories.mutate(newExcludedCategories);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Service Categories</h3>
        <p className="text-sm text-muted-foreground">
          Select which service categories you want to offer to your customers. 
          Unchecked categories will not appear in your estimator.
        </p>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {optionsCategories.map((category) => (
          <div 
            key={category.id} 
            className="flex items-start space-x-2 p-2 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <Checkbox
              id={category.id}
              checked={!excludedCategories.includes(category.id)}
              onCheckedChange={(checked) => {
                handleCategoryToggle(category.id, checked as boolean);
              }}
              className="mt-1"
            />
            <div>
              <label 
                htmlFor={category.id} 
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {category.name}
              </label>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {category.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
