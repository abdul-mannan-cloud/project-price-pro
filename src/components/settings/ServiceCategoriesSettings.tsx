
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";
import { Loader2 } from "lucide-react";

type CategoryFromDB = Database["public"]["Tables"]["categories"]["Row"];
type ContractorSettings = Database["public"]["Tables"]["contractor_settings"]["Row"];

export const ServiceCategoriesSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all available categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as CategoryFromDB[];
    }
  });

  // Fetch contractor settings to get excluded categories
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["contractor_settings"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractor_settings")
        .select("*")
        .eq("id", user.id)
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

      const { error } = await supabase
        .from("contractor_settings")
        .update({ excluded_categories: excludedCategories })
        .eq("id", user.id);

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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading categories...</span>
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
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Service Categories</h3>
        <p className="text-sm text-muted-foreground">
          Select which service categories you want to offer to your customers. 
          Unchecked categories will not appear in your estimator.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((category) => (
          <div 
            key={category.id} 
            className="flex items-start space-x-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <Checkbox
              id={category.id}
              checked={!excludedCategories.includes(category.id)}
              onCheckedChange={(checked) => {
                handleCategoryToggle(category.id, checked as boolean);
              }}
            />
            <div className="space-y-1">
              <label 
                htmlFor={category.id} 
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {category.name}
              </label>
              {category.description && (
                <p className="text-sm text-muted-foreground">
                  {category.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
