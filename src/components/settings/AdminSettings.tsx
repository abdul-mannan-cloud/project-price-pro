import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";

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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Leads Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractors?.map((contractor) => (
                <TableRow key={contractor.id}>
                  <TableCell>{contractor.business_name}</TableCell>
                  <TableCell>{contractor.contact_email}</TableCell>
                  <TableCell>{contractor.contact_phone}</TableCell>
                  <TableCell>{contractor.leads?.count || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium">Leads</h3>
        <div className="mt-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Estimated Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads?.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>{lead.project_title}</TableCell>
                  <TableCell>{lead.category}</TableCell>
                  <TableCell>{lead.status}</TableCell>
                  <TableCell>${lead.estimated_cost}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};