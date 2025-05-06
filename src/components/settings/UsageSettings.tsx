import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export const UsageSettings = () => {

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({
                    title: "Error",
                    description: "No authenticated user found. Please log in again.",
                    variant: "destructive",
                });
            } else {
                const { data: existingContractor, error } = await supabase
                    .from("contractors")
                    .select("*")
                    .eq("user_id", user.id)
                    .maybeSingle();

                const response = await supabase.functions.invoke('get-payment-methods', {
                    body: {
                        customer_id: existingContractor?.stripe_customer_id,
                    },
                });
            }
        };
        fetchUser();
    }, [])
    
    return (
        <div className="space-y-4">
        <h1>Usage</h1>
        <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Payment Methods</p>

        </div>
        </div>
    );
};