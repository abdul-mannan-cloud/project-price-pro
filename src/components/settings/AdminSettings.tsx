import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/ui/table";

export const AdminSettings = () => {
  const { data: contractors } = useQuery({
    queryKey: ["adminContractors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors")
        .select(`
          *,
          leads (
            count
          )
        `);

      if (error) throw error;
      return data;
    },
  });

  const { data: leads } = useQuery({
    queryKey: ["adminLeads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Contractors</h3>
        <div className="mt-2">
          <pre className="bg-secondary p-4 rounded-lg overflow-auto">
            {JSON.stringify(contractors, null, 2)}
          </pre>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">Leads</h3>
        <div className="mt-2">
          <pre className="bg-secondary p-4 rounded-lg overflow-auto">
            {JSON.stringify(leads, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};