import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AIInstructionsForm } from "@/components/settings/AIInstructionsForm";
import { AIRateForm } from "@/components/settings/AIRateForm";
import { AIPreferencesSettings } from "@/components/settings/AIPreferencesSettings";
import { Loader2 } from "lucide-react";

// Define types
interface AIInstruction {
    title: string;
    description: string;
    instructions: string;
}

interface AIRate {
    title: string;
    description: string | null;
    rate: number;
    unit: string;
    type: string;
    instructions?: string;
}

export const AIPreferencesPage = () => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState("general");

    // Fetch contractor data
    const { data: contractorData, isLoading: isContractorLoading } = useQuery({
        queryKey: ["contractor-data"],
        queryFn: async () => {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authenticated user");

            // Get contractor
            const { data: contractor, error: contractorError } = await supabase
                .from("contractors")
                .select("id, user_id")
                .eq("user_id", user.id)
                .single();

            if (contractorError) throw contractorError;

            return contractor;
        },
    });

    // Fetch AI instructions
    const { data: aiInstructions, isLoading: isInstructionsLoading } = useQuery({
        queryKey: ["ai-instructions"],
        queryFn: async () => {
            if (!contractorData?.id) return [];

            const { data, error } = await supabase
                .from("ai_instructions")
                .select("*")
                .eq("contractor_id", contractorData.id);

            if (error) throw error;

            return data.map(instruction => ({
                title: instruction.title,
                description: instruction.description,
                instructions: instruction.instructions
            })) || [];
        },
        enabled: !!contractorData?.id,
    });

    // Fetch AI rates
    const { data: aiRates, isLoading: isRatesLoading } = useQuery({
        queryKey: ["ai-rates"],
        queryFn: async () => {
            if (!contractorData?.id) return [];

            const { data, error } = await supabase
                .from("ai_rates")
                .select("*")
                .eq("contractor_id", contractorData.id);

            if (error) throw error;

            return data.map(rate => ({
                title: rate.title,
                description: rate.description,
                rate: rate.rate,
                unit: rate.unit,
                type: rate.type,
                instructions: rate.instructions
            })) || [];
        },
        enabled: !!contractorData?.id,
    });

    // Save AI instructions
    const saveInstructions = useMutation({
        mutationFn: async (instructions: AIInstruction[]) => {
            if (!contractorData?.id) throw new Error("Contractor ID not found");

            // First delete existing instructions
            const { error: deleteError } = await supabase
                .from("ai_instructions")
                .delete()
                .eq("contractor_id", contractorData.id);

            if (deleteError) throw deleteError;

            // Then insert new instructions
            if (instructions.length > 0) {
                const instructionsToInsert = instructions.map(instruction => ({
                    contractor_id: contractorData.id,
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
            if (!contractorData?.id) throw new Error("Contractor ID not found");

            // First delete existing rates
            const { error: deleteError } = await supabase
                .from("ai_rates")
                .delete()
                .eq("contractor_id", contractorData.id);

            if (deleteError) throw deleteError;

            // Then insert new rates
            if (rates.length > 0) {
                const ratesToInsert = rates.map(rate => ({
                    contractor_id: contractorData.id,
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

    const isLoading = isContractorLoading || isInstructionsLoading || isRatesLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-medium mb-2">AI Preferences</h3>
                <p className="text-sm text-muted-foreground">
                    Configure how AI generates estimates and helps with your projects.
                </p>
            </div>

            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-3 mb-6">
                    <TabsTrigger value="general">General Settings</TabsTrigger>
                    <TabsTrigger value="instructions">AI Instructions</TabsTrigger>
                    <TabsTrigger value="rates">AI Rates</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-4">
                    <AIPreferencesSettings />
                </TabsContent>

                <TabsContent value="instructions" className="mt-4">
                    <AIInstructionsForm
                        instructions={aiInstructions || []}
                        onSave={(instructions) => saveInstructions.mutate(instructions)}
                    />
                </TabsContent>

                <TabsContent value="rates" className="mt-4">
                    <AIRateForm
                        rates={aiRates || []}
                        onSave={(rates) => saveRates.mutate(rates)}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AIPreferencesPage;