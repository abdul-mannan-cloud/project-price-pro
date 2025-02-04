import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorPicker } from "@/components/ui/color-picker";
import { LayoutDashboard, Users, Settings as SettingsIcon, PlusCircle, MinusCircle, Edit, Trash } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomSelect } from "@/components/ui/custom-select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Json } from "@/integrations/supabase/types";

const rateOptions = [
  { value: "CF", label: "Cubic Feet (CF)" },
  { value: "CY", label: "Cubic Yards (CY)" },
  { value: "DY", label: "Day (DY)" },
  { value: "EA", label: "Each (EA)" },
  { value: "GAL", label: "Gallon (Gal)" },
  { value: "HR", label: "Hour (HR)" },
  { value: "IN", label: "Inch (IN)" },
  { value: "LBS", label: "Pounds (LBS)" },
  { value: "LF", label: "Linear Foot (LF)" },
  { value: "LS", label: "Lump Sum (LS)" },
  { value: "MO", label: "Month (MO)" },
  { value: "SF", label: "Square Foot (SF)" },
  { value: "SHT", label: "Sheet (SHT)" },
  { value: "SQ", label: "Square (SQ)" },
  { value: "SY", label: "Square Yards (SY)" },
  { value: "TONS", label: "Tons (TONS)" },
  { value: "WK", label: "Week (WK)" },
  { value: "WY", label: "Week (WY)" },
  { value: "YD", label: "Yard (YD)" },
];

const typeOptions = [
  { value: "material_labor", label: "Material + Labor" },
  { value: "material", label: "Material" },
  { value: "labor", label: "Labor" },
];

interface BrandingColors {
  primary: string;
  secondary: string;
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [editingEstimateIndex, setEditingEstimateIndex] = useState<number | null>(null);
  const [editingInstructionIndex, setEditingInstructionIndex] = useState<number | null>(null);
  const [aiEstimateRows, setAiEstimateRows] = useState([{ title: "", rate: "HR", type: "material_labor", instructions: "" }]);
  const [aiInstructionRows, setAiInstructionRows] = useState([{ instruction: "" }]);
  const [isEstimateDialogOpen, setIsEstimateDialogOpen] = useState(false);
  const [isInstructionDialogOpen, setIsInstructionDialogOpen] = useState(false);
  const [currentEstimate, setCurrentEstimate] = useState({ title: "", rate: "HR", type: "material_labor", instructions: "" });
  const [currentInstruction, setCurrentInstruction] = useState({ instruction: "" });

  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: SettingsIcon }
  ];

  // Fetch contractor data
  const { data: contractor, isLoading } = useQuery({
    queryKey: ["contractor"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("contractors")
        .select("*, contractor_settings(*)")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch available categories
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Options")
        .select("*")
        .single();

      if (error) throw error;
      return Object.keys(data).filter(key => key !== "Key Options");
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (formData: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { error: contractorError } = await supabase
        .from("contractors")
        .update({
          business_name: formData.businessName,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          business_address: formData.businessAddress,
          website: formData.website,
          license_number: formData.licenseNumber,
          branding_colors: {
            primary: formData.primaryColor,
            secondary: formData.secondaryColor
          }
        })
        .eq("id", user.id);

      if (contractorError) throw contractorError;

      const { error: settingsError } = await supabase
        .from("contractor_settings")
        .update({
          minimum_project_cost: formData.minimumProjectCost,
          markup_percentage: formData.markupPercentage,
          tax_rate: formData.taxRate,
          excluded_categories: selectedCategories,
          ai_preferences: {
            rate: currentEstimate.rate,
            type: currentEstimate.type,
            instructions: currentEstimate.instructions
          }
        })
        .eq("id", user.id);

      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    updateSettings.mutate({
      businessName: formData.get("businessName"),
      contactEmail: formData.get("contactEmail"),
      contactPhone: formData.get("contactPhone"),
      businessAddress: formData.get("businessAddress"),
      website: formData.get("website"),
      licenseNumber: formData.get("licenseNumber"),
      primaryColor: formData.get("primaryColor"),
      secondaryColor: formData.get("secondaryColor"),
      minimumProjectCost: formData.get("minimumProjectCost"),
      markupPercentage: formData.get("markupPercentage"),
      taxRate: formData.get("taxRate"),
    });
  };

  const handleEditEstimate = (index: number) => {
    setCurrentEstimate(aiEstimateRows[index]);
    setEditingEstimateIndex(index);
    setIsEstimateDialogOpen(true);
  };

  const handleEditInstruction = (index: number) => {
    setCurrentInstruction(aiInstructionRows[index]);
    setEditingInstructionIndex(index);
    setIsInstructionDialogOpen(true);
  };

  const handleSaveEstimate = () => {
    if (editingEstimateIndex !== null) {
      const newRows = [...aiEstimateRows];
      newRows[editingEstimateIndex] = currentEstimate;
      setAiEstimateRows(newRows);
    } else {
      setAiEstimateRows([...aiEstimateRows, currentEstimate]);
    }
    setIsEstimateDialogOpen(false);
    setEditingEstimateIndex(null);
    setCurrentEstimate({ title: "", rate: "HR", type: "material_labor", instructions: "" });
  };

  const handleSaveInstruction = () => {
    if (editingInstructionIndex !== null) {
      const newRows = [...aiInstructionRows];
      newRows[editingInstructionIndex] = currentInstruction;
      setAiInstructionRows(newRows);
    } else {
      setAiInstructionRows([...aiInstructionRows, currentInstruction]);
    }
    setIsInstructionDialogOpen(false);
    setEditingInstructionIndex(null);
    setCurrentInstruction({ instruction: "" });
  };

  const handleDeleteEstimate = (index: number) => {
    setAiEstimateRows(aiEstimateRows.filter((_, i) => i !== index));
  };

  const handleDeleteInstruction = (index: number) => {
    setAiInstructionRows(aiInstructionRows.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Safely type cast the branding_colors
  const defaultColors: BrandingColors = {
    primary: "#007AFF",
    secondary: "#F5F5F7"
  };

  const brandingColors: BrandingColors = 
    contractor?.branding_colors && 
    typeof contractor.branding_colors === 'object' && 
    !Array.isArray(contractor.branding_colors) && 
    contractor.branding_colors as { [key: string]: Json } &&
    'primary' in contractor.branding_colors && 
    'secondary' in contractor.branding_colors
      ? {
          primary: String(contractor.branding_colors.primary),
          secondary: String(contractor.branding_colors.secondary)
        }
      : defaultColors;

  return (
    <div className="min-h-screen bg-secondary">
      <NavBar items={navItems} />
      <form onSubmit={handleSave} className="container mx-auto py-8">
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-medium mb-2">Business Information</h2>
            <p className="text-sm text-muted-foreground mb-4">Manage your business details and contact information.</p>
            <div className="space-y-4">
              <div className="form-group">
                <Input
                  label="Business Name"
                  defaultValue={contractor?.business_name}
                  name="businessName"
                  required
                />
              </div>
              <div className="form-group">
                <Input
                  label="Contact Email"
                  defaultValue={contractor?.contact_email}
                  name="contactEmail"
                  type="email"
                  required
                />
              </div>
              <div className="form-group">
                <Input
                  label="Contact Phone"
                  defaultValue={contractor?.contact_phone}
                  name="contactPhone"
                  type="tel"
                />
              </div>
              <div className="form-group">
                <Input
                  label="Business Address"
                  defaultValue={contractor?.business_address}
                  name="businessAddress"
                />
              </div>
              <div className="form-group">
                <Input
                  label="Website"
                  defaultValue={contractor?.website}
                  name="website"
                  type="url"
                />
              </div>
              <div className="form-group">
                <Input
                  label="License Number"
                  defaultValue={contractor?.license_number}
                  name="licenseNumber"
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <h2 className="text-lg font-medium mb-2">Branding</h2>
            <p className="text-sm text-muted-foreground mb-4">Customize your brand colors to match your business identity.</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Primary Color
                </label>
                <ColorPicker
                  color={brandingColors.primary}
                  onChange={(color) => {
                    // Update primary color in CSS variables
                    document.documentElement.style.setProperty('--primary', color);
                    document.documentElement.style.setProperty('--primary-foreground', '#FFFFFF');
                  }}
                />
                <input type="hidden" name="primaryColor" value={brandingColors.primary} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Secondary Color
                </label>
                <ColorPicker
                  color={brandingColors.secondary}
                  onChange={(color) => {
                    // Update secondary color in CSS variables
                    document.documentElement.style.setProperty('--secondary', color);
                    document.documentElement.style.setProperty('--secondary-foreground', '#1d1d1f');
                  }}
                />
                <input type="hidden" name="secondaryColor" value={brandingColors.secondary} />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <h2 className="text-lg font-medium mb-2">Estimate Settings</h2>
            <p className="text-sm text-muted-foreground mb-4">Configure your estimate calculations. Note: Markup percentages are not visible to leads.</p>
            <div className="space-y-4">
              <div className="form-group">
                <Input
                  label="Minimum Project Cost ($)"
                  defaultValue={contractor?.contractor_settings?.minimum_project_cost}
                  name="minimumProjectCost"
                  type="number"
                />
              </div>
              <div className="form-group">
                <Input
                  label="Markup Percentage (%)"
                  defaultValue={contractor?.contractor_settings?.markup_percentage}
                  name="markupPercentage"
                  type="number"
                />
              </div>
              <div className="form-group">
                <Input
                  label="Tax Rate (%)"
                  defaultValue={contractor?.contractor_settings?.tax_rate}
                  name="taxRate"
                  type="number"
                />
              </div>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Manage Service Categories
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Select Available Services</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Choose which service categories you want to offer. Your customers will only see and answer questions for the categories you select.
                    </p>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    {categories?.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={category}
                          checked={!selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories(selectedCategories.filter(c => c !== category));
                            } else {
                              setSelectedCategories([...selectedCategories, category]);
                            }
                          }}
                        />
                        <label htmlFor={category} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <h2 className="text-lg font-medium mb-2">AI Estimate Preferences</h2>
            <p className="text-sm text-muted-foreground mb-4">Configure how AI generates estimates for your services.</p>
            <div className="space-y-4">
              <div className="space-y-4">
                {aiEstimateRows.map((row, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{row.title || 'Untitled Estimate'}</p>
                      <p className="text-sm text-muted-foreground">
                        Rate: {row.rate}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Type: {row.type}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditEstimate(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteEstimate(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingEstimateIndex(null);
                    setCurrentEstimate({ title: "", rate: "HR", type: "material_labor", instructions: "" });
                    setIsEstimateDialogOpen(true);
                  }}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Estimate Setting
                </Button>
              </div>

              <Dialog open={isEstimateDialogOpen} onOpenChange={setIsEstimateDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingEstimateIndex !== null ? 'Edit Estimate Setting' : 'Add Estimate Setting'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      label="Title"
                      value={currentEstimate.title}
                      onChange={(e) => setCurrentEstimate({ ...currentEstimate, title: e.target.value })}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Rate</label>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            type="number"
                            placeholder="Enter rate"
                            value={currentEstimate.rate}
                            onChange={(e) => setCurrentEstimate({ ...currentEstimate, rate: e.target.value })}
                          />
                        </div>
                        <div className="flex-1">
                          <CustomSelect
                            value={currentEstimate.rateUnit}
                            onValueChange={(value) => setCurrentEstimate({ ...currentEstimate, rateUnit: value })}
                            options={rateOptions}
                          />
                        </div>
                      </div>
                    </div>
                    <CustomSelect
                      label="Type"
                      value={currentEstimate.type}
                      onValueChange={(value) => setCurrentEstimate({ ...currentEstimate, type: value })}
                      options={typeOptions}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Tell AI how to use this rate (optional)</label>
                      <Textarea
                        placeholder="Enter instructions for AI"
                        value={currentEstimate.instructions || ''}
                        onChange={(e) => setCurrentEstimate({ ...currentEstimate, instructions: e.target.value })}
                        className="min-h-[100px]"
                      />
                    </div>
                    <Button type="button" onClick={handleSaveEstimate} className="w-full">
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <div className="space-y-4">
                {aiInstructionRows.map((row, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">{row.instruction || 'Empty instruction'}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditInstruction(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteInstruction(index)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingInstructionIndex(null);
                    setCurrentInstruction({ instruction: "" });
                    setIsInstructionDialogOpen(true);
                  }}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Instruction
                </Button>
              </div>

              <Dialog open={isInstructionDialogOpen} onOpenChange={setIsInstructionDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingInstructionIndex !== null ? 'Edit Instruction' : 'Add Instruction'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Enter specific instructions for AI estimates"
                      value={currentInstruction.instruction}
                      onChange={(e) => setCurrentInstruction({ instruction: e.target.value })}
                      className="min-h-[100px]"
                    />
                    <Button type="button" onClick={handleSaveInstruction} className="w-full">
                      Save
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
