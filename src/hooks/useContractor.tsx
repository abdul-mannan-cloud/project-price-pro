import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Define types for the contractor data and context
interface ContractorSettings {
    // Add specific contractor settings fields based on your data structure
    [key: string]: any;
}

interface Contractor {
    id: string;
    name?: string;
    contractor_settings?: ContractorSettings;
    // Add other contractor fields as needed
    [key: string]: any;
}

interface ContractorContextType {
    contractorId: string;
    contractor: Contractor | null;
    isLoading: boolean;
    error: string | null;
    updateContractorId: (id: string) => void;
    isDefaultContractor: boolean;
}

interface ContractorProviderProps {
    children: ReactNode;
}

// Create the context with a default value
const ContractorContext = createContext<ContractorContextType | null>(null);

// UUID validation function
const isValidUUID = (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
};

// Default contractor ID (same as in your EstimatePage)
const DEFAULT_CONTRACTOR_ID = "098bcb69-99c6-445b-bf02-94dc7ef8c938";

export const ContractorProvider = ({ children }: ContractorProviderProps) => {
    const [contractorId, setContractorId] = useState<string>(DEFAULT_CONTRACTOR_ID);
    const [contractor, setContractor] = useState<Contractor | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Function to update the contractor ID
    const updateContractorId = (id: string) => {
        // Validate and set the contractor ID
        const validId = id && isValidUUID(id) ? id : DEFAULT_CONTRACTOR_ID;
        setContractorId(validId);

        // Clear contractor data when ID changes
        setContractor(null);
        setIsLoading(true);
        setError(null);
    };

    // Fetch contractor data whenever the ID changes
    useEffect(() => {
        const fetchContractorData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const { data, error } = await supabase
                    .from("contractors")
                    .select("*, contractor_settings(*)")
                    .eq("id", contractorId)
                    .maybeSingle();

                if (error) {
                    throw error;
                }

                if (!data) {
                    throw new Error("Contractor not found");
                }

                setContractor(data as Contractor);
            } catch (err: any) {
                console.error("Error fetching contractor:", err);
                setError(err.message || "Failed to fetch contractor data");
            } finally {
                setIsLoading(false);
            }
        };

        if (contractorId) {
            fetchContractorData();
        }
    }, [contractorId]);

    // Value object to be provided by the context
    const value: ContractorContextType = {
        contractorId,
        contractor,
        isLoading,
        error,
        updateContractorId,
        isDefaultContractor: contractorId === DEFAULT_CONTRACTOR_ID,
    };

    return (
        <ContractorContext.Provider value={value}>
            {children}
            </ContractorContext.Provider>
    );
};

// Custom hook to use the contractor context
export const useContractor = (): ContractorContextType => {
    const context = useContext(ContractorContext);

    if (context === null) {
        throw new Error("useContractor must be used within a ContractorProvider");
    }

    return context;
};