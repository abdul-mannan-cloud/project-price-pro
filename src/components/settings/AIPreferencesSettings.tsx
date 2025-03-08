import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Json } from "@/integrations/supabase/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Info, Plus, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// General preferences types
interface AIPreferences {
  rate: string;
  type: string;
  instructions: string;
}

interface ContractorSettings {
  ai_preferences: AIPreferences;
  ai_instructions: string;
}

interface SupabaseContractorSettings {
  ai_preferences: Json;
  ai_instructions: string | null;
}

// AI Instructions types
interface AIInstruction {
  title: string;
  description: string;
  instructions: string;
}

// AI Rates types
interface AIRate {
  title: string;
  description: string | null;
  rate: number;
  unit: string;
  type: string;
  instructions?: string;
}

const defaultPreferences: AIPreferences = {
  rate: "HR",
  type: "material_labor",
  instructions: ""
};

const UNIT_OPTIONS = [
  { value: "CF", label: "Cubic Feet (CF)" },
  { value: "CY", label: "Cubic Yards (CY)" },
  { value: "DY", label: "Day (DY)" },
  { value: "EA", label: "Each (EA)" },
  { value: "GAL", label: "Gallon (GAL)" },
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
  { value: "YD", label: "Yard (YD)" },
];

const TYPE_OPTIONS = [
  { value: "material_labor", label: "Material + Labor" },
  { value: "material", label: "Material" },
  { value: "labor", label: "Labor" },
];

export const AIPreferencesSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // State for AI instructions
  const [aiInstructions, setAiInstructions] = useState<AIInstruction[]>([]);
  const [isAddingInstruction, setIsAddingInstruction] = useState(false);
  const [newInstruction, setNewInstruction] = useState<AIInstruction>({
    title: "",
    description: "",
    instructions: ""
  });

  // State for AI rates
  const [aiRates, setAiRates] = useState<AIRate[]>([]);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [newRate, setNewRate] = useState<AIRate>({
    title: "",
    description: "",
    rate: 0,
    unit: "",
    type: "material_labor",
    instructions: ""
  });

  // Get contractor data for ID reference
  const { data: contractor, isLoading: isContractorLoading } = useQuery({
    queryKey: ["contractor-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch general AI settings
  const { data: settings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ["ai-preferences"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const contractor = await supabase
          .from("contractors")
          .select("*")
          .eq("user_id", user.id)
          .single();

      const { data, error } = await supabase
          .from("contractor_settings")
          .select("*")
          .eq("id", contractor.data.id);

      const contractors = data[0];

      if (error) {
        console.log('supabase Ai preferences error:', error);
        throw error;
      }

      const supabaseData = contractors as SupabaseContractorSettings;
      const preferences = supabaseData.ai_preferences as any;

      // Ensure we have all required fields with proper types
      const aiPreferences: AIPreferences = {
        rate: typeof preferences?.rate === 'string' ? preferences.rate : defaultPreferences.rate,
        type: typeof preferences?.type === 'string' ? preferences.type : defaultPreferences.type,
        instructions: typeof preferences?.instructions === 'string' ? preferences.instructions : defaultPreferences.instructions
      };

      return {
        ai_preferences: aiPreferences,
        ai_instructions: supabaseData.ai_instructions || ""
      } as ContractorSettings;
    },
  });

  // Fetch AI instructions
  const { isLoading: isInstructionsLoading } = useQuery({
    queryKey: ["ai-instructions"],
    queryFn: async () => {
      if (!contractor?.id) return [];

      const { data, error } = await supabase
          .from("ai_instructions")
          .select("*")
          .eq("contractor_id", contractor.id);

      if (error) throw error;

      const instructions = data.map(instruction => ({
        title: instruction.title,
        description: instruction.description,
        instructions: instruction.instructions
      }));

      setAiInstructions(instructions);
      return instructions;
    },
    enabled: !!contractor?.id,
  });

  // Fetch AI rates
  const { isLoading: isRatesLoading } = useQuery({
    queryKey: ["ai-rates"],
    queryFn: async () => {
      if (!contractor?.id) return [];

      const { data, error } = await supabase
          .from("ai_rates")
          .select("*")
          .eq("contractor_id", contractor.id);

      if (error) throw error;

      const rates = data.map(rate => ({
        title: rate.title,
        description: rate.description,
        rate: rate.rate,
        unit: rate.unit,
        type: rate.type,
        instructions: rate.instructions
      }));

      setAiRates(rates);
      return rates;
    },
    enabled: !!contractor?.id,
  });

  // Update general settings
  const updateSettings = useMutation({
    mutationFn: async (formData: ContractorSettings) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Convert AIPreferences to a plain object that matches Json type
      const aiPreferencesJson: { [key: string]: string } = {
        rate: formData.ai_preferences.rate,
        type: formData.ai_preferences.type,
        instructions: formData.ai_preferences.instructions
      };

      const contractor = await supabase
          .from("contractors")
          .select("id")
          .eq("user_id", user.id)
          .single();

      const { error } = await supabase
          .from("contractor_settings")
          .update({
            ai_preferences: aiPreferencesJson as Json,
            ai_instructions: formData.ai_instructions
          })
          .eq("id", contractor.data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-preferences"] });
      toast({
        title: "Settings saved",
        description: "Your AI preferences have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save AI instructions
  const saveInstructions = useMutation({
    mutationFn: async (instructions: AIInstruction[]) => {
      if (!contractor?.id) throw new Error("Contractor ID not found");

      // First delete existing instructions
      const { error: deleteError } = await supabase
          .from("ai_instructions")
          .delete()
          .eq("contractor_id", contractor.id);

      if (deleteError) throw deleteError;

      // Then insert new instructions
      if (instructions.length > 0) {
        const instructionsToInsert = instructions.map(instruction => ({
          contractor_id: contractor.id,
          title: instruction.title,
          description: instruction.description,
          instructions: instruction.instructions
        }));

        const { error: insertError } = await supabase
            .from("ai_instructions")
            .insert(instructionsToInsert);

        if (insertError) throw insertError;
      }

      return instructions;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-instructions"] });
      toast({
        title: "Instructions saved",
        description: "Your AI instructions have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving AI instructions:", error);
      toast({
        title: "Error",
        description: "Failed to save AI instructions. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save AI rates
  const saveRates = useMutation({
    mutationFn: async (rates: AIRate[]) => {
      if (!contractor?.id) throw new Error("Contractor ID not found");

      // First delete existing rates
      const { error: deleteError } = await supabase
          .from("ai_rates")
          .delete()
          .eq("contractor_id", contractor.id);

      if (deleteError) throw deleteError;

      // Then insert new rates
      if (rates.length > 0) {
        const ratesToInsert = rates.map(rate => ({
          contractor_id: contractor.id,
          title: rate.title,
          description: rate.description,
          rate: rate.rate,
          unit: rate.unit,
          type: rate.type,
          instructions: rate.instructions || ""
        }));

        const { error: insertError } = await supabase
            .from("ai_rates")
            .insert(ratesToInsert);

        if (insertError) throw insertError;
      }

      return rates;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-rates"] });
      toast({
        title: "Rates saved",
        description: "Your AI rates have been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error saving AI rates:", error);
      toast({
        title: "Error",
        description: "Failed to save AI rates. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission for general settings
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: ContractorSettings = {
      ai_preferences: {
        rate: formData.get("rate") as string || defaultPreferences.rate,
        type: formData.get("type") as string || defaultPreferences.type,
        instructions: formData.get("instructions") as string || defaultPreferences.instructions
      },
      ai_instructions: formData.get("ai_instructions") as string || ""
    };
    updateSettings.mutate(data);
  };

  // Handle AI instructions
  const addInstruction = () => {
    if (!newInstruction.title || !newInstruction.instructions) {
      toast({
        title: "Error",
        description: "Title and instructions are required.",
        variant: "destructive",
      });
      return;
    }

    setAiInstructions([...aiInstructions, newInstruction]);
    setIsAddingInstruction(false);
    setNewInstruction({
      title: "",
      description: "",
      instructions: ""
    });
  };

  const removeInstruction = (index: number) => {
    setAiInstructions(aiInstructions.filter((_, i) => i !== index));
  };

  const handleSaveInstructions = () => {
    saveInstructions.mutate(aiInstructions);
  };

  // Handle AI rates
  const addRate = () => {
    if (!newRate.title || !newRate.unit || newRate.rate <= 0) {
      toast({
        title: "Error",
        description: "Title, unit, and a positive rate are required.",
        variant: "destructive",
      });
      return;
    }

    setAiRates([...aiRates, newRate]);
    setIsAddingRate(false);
    setNewRate({
      title: "",
      description: "",
      rate: 0,
      unit: "",
      type: "material_labor",
      instructions: ""
    });
  };

  const removeRate = (index: number) => {
    setAiRates(aiRates.filter((_, i) => i !== index));
  };

  const handleSaveRates = () => {
    saveRates.mutate(aiRates);
  };

  const isLoading = isContractorLoading || isSettingsLoading || isInstructionsLoading || isRatesLoading;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
      <div className="space-y-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="instructions">AI Instructions</TabsTrigger>
            <TabsTrigger value="rates">AI Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>General AI Settings</CardTitle>
                <CardDescription>
                  Configure how AI generates estimates and calculates costs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="rate">Default Rate Type</Label>
                    <Select
                        name="rate"
                        defaultValue={settings?.ai_preferences.rate || defaultPreferences.rate}
                    >
                      <SelectTrigger id="rate">
                        <SelectValue placeholder="Select rate type" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      The default unit used for pricing calculations
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">Default Calculation Type</Label>
                    <Select
                        name="type"
                        defaultValue={settings?.ai_preferences.type || defaultPreferences.type}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select calculation type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      How costs are calculated by default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">Default AI Instructions</Label>
                    <Textarea
                        id="instructions"
                        name="instructions"
                        defaultValue={settings?.ai_preferences.instructions || defaultPreferences.instructions}
                        placeholder="Enter specific instructions for AI estimate generation..."
                        className="min-h-[100px]"
                    />
                    <p className="text-sm text-muted-foreground">
                      These instructions will be used by default when generating estimates
                    </p>
                  </div>

                  {/*<div className="space-y-2">*/}
                  {/*  <Label htmlFor="ai_instructions">Additional Instructions</Label>*/}
                  {/*  <Textarea*/}
                  {/*      id="ai_instructions"*/}
                  {/*      name="ai_instructions"*/}
                  {/*      defaultValue={settings?.ai_instructions || ""}*/}
                  {/*      placeholder="Enter any additional AI instructions..."*/}
                  {/*      className="min-h-[100px]"*/}
                  {/*  />*/}
                  {/*  <p className="text-sm text-muted-foreground">*/}
                  {/*    Additional context or requirements for the AI to consider*/}
                  {/*  </p>*/}
                  {/*</div>*/}

                  <Button type="submit" disabled={updateSettings.isPending} className="w-full">
                    {updateSettings.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructions" className="mt-4">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium">AI Instructions</h3>
                </div>
                <Button
                    onClick={() => setIsAddingInstruction(true)}
                    size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Instruction
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Instructions</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiInstructions.map((instruction, index) => (
                      <TableRow key={index}>
                        <TableCell>{instruction.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{instruction.description}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{instruction.instructions}</TableCell>
                        <TableCell>
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInstruction(index)}
                              className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Dialog open={isAddingInstruction} onOpenChange={setIsAddingInstruction}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Instruction</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="instruction-title">Title</Label>
                      <Input
                          id="instruction-title"
                          value={newInstruction.title}
                          onChange={(e) => setNewInstruction({ ...newInstruction, title: e.target.value })}
                          placeholder="e.g., Material Cost Calculation"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instruction-description">Description</Label>
                      <Input
                          id="instruction-description"
                          value={newInstruction.description}
                          onChange={(e) => setNewInstruction({ ...newInstruction, description: e.target.value })}
                          placeholder="Brief description of the instruction"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="instruction-content">Instructions</Label>
                      </div>
                      <Textarea
                          id="instruction-content"
                          className="w-full min-h-[100px]"
                          value={newInstruction.instructions}
                          onChange={(e) => setNewInstruction({ ...newInstruction, instructions: e.target.value })}
                          placeholder="Enter detailed instructions for AI..."
                      />
                    </div>
                    <Button onClick={addInstruction} className="w-full">
                      Add Instruction
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {aiInstructions.length > 0 && (
                  <Button onClick={handleSaveInstructions} className="w-full">
                    Save Changes
                  </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="rates" className="mt-4">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium">AI Rates</h3>
                </div>
                <Button
                    onClick={() => setIsAddingRate(true)}
                    size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rate
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Instructions</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aiRates.map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell>{rate.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{rate.description}</TableCell>
                        <TableCell>{rate.rate}</TableCell>
                        <TableCell>{rate.unit}</TableCell>
                        <TableCell>{rate.type}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{rate.instructions}</TableCell>
                        <TableCell>
                          <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRate(index)}
                              className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Dialog open={isAddingRate} onOpenChange={setIsAddingRate}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Rate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="rate-title">Title</Label>
                      <Input
                          id="rate-title"
                          value={newRate.title}
                          onChange={(e) => setNewRate({ ...newRate, title: e.target.value })}
                          placeholder="e.g., Standard Labor Rate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate-description">Description</Label>
                      <Input
                          id="rate-description"
                          value={newRate.description || ""}
                          onChange={(e) => setNewRate({ ...newRate, description: e.target.value })}
                          placeholder="Brief description of the rate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate-value">Rate</Label>
                      <Input
                          id="rate-value"
                          type="number"
                          value={newRate.rate}
                          onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) || 0 })}
                          placeholder="e.g., 75"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate-unit">Unit</Label>
                      <Select
                          value={newRate.unit}
                          onValueChange={(value) => setNewRate({ ...newRate, unit: value })}
                      >
                        <SelectTrigger id="rate-unit">
                          <SelectValue placeholder="Select a unit" />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rate-type">Type</Label>
                      <Select
                          value={newRate.type}
                          onValueChange={(value) => setNewRate({ ...newRate, type: value })}
                      >
                        <SelectTrigger id="rate-type">
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <Label htmlFor="rate-instructions">Instructions (Optional)</Label>
                      </div>
                      <Textarea
                          id="rate-instructions"
                          className="w-full min-h-[100px]"
                          value={newRate.instructions}
                          onChange={(e) => setNewRate({ ...newRate, instructions: e.target.value })}
                          placeholder="Tell AI how to use this rate..."
                      />
                    </div>
                    <Button onClick={addRate} className="w-full">
                      Add Rate
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {aiRates.length > 0 && (
                  <Button onClick={handleSaveRates} className="w-full">
                    Save Changes
                  </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
};