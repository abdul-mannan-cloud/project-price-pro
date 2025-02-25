
import { useState, useEffect } from "react";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BrandingColors } from "@/types/settings";
import { supabase } from "@/integrations/supabase/client";

interface BrandingSettingsProps {
  initialColors: BrandingColors;
  onSave: (colors: BrandingColors) => Promise<void>;
}

export const BrandingSettings = ({ initialColors, onSave }: BrandingSettingsProps) => {
  const [brandingColors, setBrandingColors] = useState<BrandingColors>(initialColors);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Load and apply saved colors on component mount
  useEffect(() => {
    const loadAndApplyColors = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: contractor, error } = await supabase
          .from('contractors')
          .select('branding_colors')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (contractor?.branding_colors) {
          const colors = contractor.branding_colors as BrandingColors;
          setBrandingColors(colors);
          applyGlobalColors(colors);
        }
      } catch (error) {
        console.error('Error loading branding colors:', error);
      }
    };

    loadAndApplyColors();
  }, []);

  // Apply colors whenever they change
  useEffect(() => {
    if (initialColors) {
      setBrandingColors(initialColors);
      applyGlobalColors(initialColors);
    }
  }, [initialColors]);

  const applyGlobalColors = (colors: BrandingColors) => {
    // Set primary color and its variations
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
  };

  const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
    const newColors = {
      ...brandingColors,
      [type]: color
    };
    setBrandingColors(newColors);
    applyGlobalColors(newColors);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(brandingColors);
      
      // Update the colors in Supabase directly
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error } = await supabase
        .from('contractors')
        .update({ branding_colors: brandingColors })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Branding colors updated",
        description: "Your brand colors have been updated and saved successfully.",
      });
    } catch (error) {
      console.error('Error saving branding colors:', error);
      toast({
        title: "Error",
        description: "Failed to update branding colors. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

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
              onChange={(color) => handleColorChange('primary', color)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Secondary Color
            </label>
            <ColorPicker
              color={brandingColors.secondary}
              onChange={(color) => handleColorChange('secondary', color)}
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
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
                <Button variant="secondary" className="w-full">
                  Secondary Button
                </Button>
                <Button variant="outline" className="w-full">
                  Outline Button
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
          </div>
        </div>
      </div>
    </div>
  );
};
