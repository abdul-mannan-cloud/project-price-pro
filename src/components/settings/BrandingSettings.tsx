import { useState, useEffect } from "react";
import { ColorPicker } from "@/components/ui/color-picker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { BrandingColors } from "@/types/settings";

interface BrandingSettingsProps {
  initialColors: BrandingColors;
  onSave: (colors: BrandingColors) => Promise<void>;
}

export const BrandingSettings = ({ initialColors, onSave }: BrandingSettingsProps) => {
  const [brandingColors, setBrandingColors] = useState<BrandingColors>(initialColors);
  const { toast } = useToast();

  useEffect(() => {
    if (initialColors) {
      setBrandingColors(initialColors);
      applyGlobalColors(initialColors);
    }
  }, [initialColors]);

  const isLightColor = (color: string) => {
    // Remove the hash if it exists
    const hex = color.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    // Calculate relative luminance using the formula
    // Luminance = (0.299*R + 0.587*G + 0.114*B) / 255
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return true if the color is light (luminance > 0.5)
    return luminance > 0.5;
  };

  const applyGlobalColors = (colors: BrandingColors) => {
    // Set primary color and its variations
    document.documentElement.style.setProperty('--primary', colors.primary);
    document.documentElement.style.setProperty('--primary-foreground', 
      isLightColor(colors.primary) ? '#1d1d1f' : '#FFFFFF'
    );

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
    document.documentElement.style.setProperty('--secondary-foreground',
      isLightColor(colors.secondary) ? '#1d1d1f' : '#FFFFFF'
    );
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
      await onSave(brandingColors);
      toast({
        title: "Branding colors updated",
        description: "Your brand colors have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update branding colors. Please try again.",
        variant: "destructive",
      });
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
          <Button onClick={handleSave}>
            Save Changes
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
                  className="h-20 rounded-lg flex items-center justify-center"
                  style={{ 
                    backgroundColor: brandingColors.primary,
                    color: isLightColor(brandingColors.primary) ? '#1d1d1f' : '#FFFFFF'
                  }}
                >
                  Primary Background
                </div>
                <div 
                  className="h-20 rounded-lg flex items-center justify-center"
                  style={{ 
                    backgroundColor: brandingColors.secondary,
                    color: isLightColor(brandingColors.secondary) ? '#1d1d1f' : '#FFFFFF'
                  }}
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