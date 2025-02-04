import { useState, useEffect } from "react";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

interface BrandingColors {
  primary: string;
  secondary: string;
}

export const BrandingSettings = ({ 
  initialColors,
  onSave 
}: { 
  initialColors: BrandingColors;
  onSave: (colors: BrandingColors) => void;
}) => {
  const [brandingColors, setBrandingColors] = useState<BrandingColors>(initialColors);
  const { toast } = useToast();

  // Add a query to fetch current branding colors
  const { data: currentColors } = useQuery({
    queryKey: ["brandingColors"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("branding_colors")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      // Safely type cast the branding_colors from Json to BrandingColors
      const colors = data?.branding_colors as { primary: string; secondary: string } | null;
      return colors || initialColors;
    },
  });

  // Update local state when currentColors changes
  useEffect(() => {
    if (currentColors) {
      setBrandingColors(currentColors);
      // Update CSS variables
      document.documentElement.style.setProperty('--primary', currentColors.primary);
      document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');
      document.documentElement.style.setProperty('--secondary', currentColors.secondary);
      document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');
    }
  }, [currentColors]);

  const updateBrandingColors = useMutation({
    mutationFn: async (colors: BrandingColors) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const brandingColorsJson: Json = {
        primary: colors.primary,
        secondary: colors.secondary
      };

      const { error } = await supabase
        .from("contractors")
        .update({
          branding_colors: brandingColorsJson
        })
        .eq("id", user.id);

      if (error) throw error;
      
      // Update CSS variables immediately after successful save
      document.documentElement.style.setProperty('--primary', colors.primary);
      document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');
      document.documentElement.style.setProperty('--secondary', colors.secondary);
      document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');

      // Update primary color variations
      const primaryHex = colors.primary.replace('#', '');
      const r = parseInt(primaryHex.slice(0, 2), 16);
      const g = parseInt(primaryHex.slice(2, 4), 16);
      const b = parseInt(primaryHex.slice(4, 6), 16);

      // Generate lighter and darker shades
      document.documentElement.style.setProperty('--primary-100', `rgba(${r}, ${g}, ${b}, 0.1)`);
      document.documentElement.style.setProperty('--primary-200', `rgba(${r}, ${g}, ${b}, 0.2)`);
      document.documentElement.style.setProperty('--primary-300', `rgba(${r}, ${g}, ${b}, 0.4)`);
      document.documentElement.style.setProperty('--primary-400', `rgba(${r}, ${g}, ${b}, 0.6)`);
      document.documentElement.style.setProperty('--primary-500', `rgba(${r}, ${g}, ${b}, 0.8)`);
      document.documentElement.style.setProperty('--primary-600', colors.primary);
      document.documentElement.style.setProperty('--primary-700', `rgba(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)}, 1)`);
    },
    onSuccess: () => {
      toast({
        title: "Branding colors updated",
        description: "Your brand colors have been updated successfully.",
      });
      onSave(brandingColors);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update branding colors. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Brand Colors</h2>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Primary Color
            </label>
            <ColorPicker
              color={brandingColors.primary}
              onChange={(color) => {
                setBrandingColors(prev => ({ ...prev, primary: color }));
              }}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Secondary Color
            </label>
            <ColorPicker
              color={brandingColors.secondary}
              onChange={(color) => {
                setBrandingColors(prev => ({ ...prev, secondary: color }));
              }}
            />
          </div>
          <Button 
            onClick={() => updateBrandingColors.mutate(brandingColors)}
            disabled={updateBrandingColors.isPending}
          >
            {updateBrandingColors.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Preview</h2>
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Buttons</h3>
              <div className="space-y-2">
                <Button className="w-full">
                  Primary Button
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                >
                  Outlined Button
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Background Colors</h3>
              <div className="space-y-2">
                <div 
                  className="h-20 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: brandingColors.primary }}
                >
                  Primary Background
                </div>
                <div 
                  className="h-20 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: brandingColors.secondary }}
                >
                  Secondary Background
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Text Colors</h3>
              <div className="space-y-2">
                <p style={{ color: brandingColors.primary }}>
                  This text uses the primary color
                </p>
                <p style={{ color: brandingColors.secondary }}>
                  This text uses the secondary color
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};