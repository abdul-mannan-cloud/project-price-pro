import { NavBar } from "@/components/ui/tubelight-navbar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, Settings } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

const Leads = () => {
  const navItems = [
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Leads", url: "/leads", icon: Users },
    { name: "Settings", url: "/settings", icon: Settings }
  ];

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("contractor_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <NavBar items={navItems} />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-semibold mb-6">Leads</h1>
        
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-9 py-2">Project Title</TableHead>
                <TableHead className="h-9 py-2">Category</TableHead>
                <TableHead className="h-9 py-2">Customer</TableHead>
                <TableHead className="h-9 py-2">Contact</TableHead>
                <TableHead className="h-9 py-2">Estimated Cost</TableHead>
                <TableHead className="h-9 py-2">Status</TableHead>
                <TableHead className="h-9 py-2">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="py-2 font-medium">{lead.project_title}</TableCell>
                  <TableCell className="py-2">{lead.category}</TableCell>
                  <TableCell className="py-2">{lead.user_name || "Anonymous"}</TableCell>
                  <TableCell className="py-2">
                    {lead.user_email || lead.user_phone || "N/A"}
                  </TableCell>
                  <TableCell className="py-2">
                    ${lead.estimated_cost?.toLocaleString() || "0"}
                  </TableCell>
                  <TableCell className="py-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      lead.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      lead.status === "completed" ? "bg-green-100 text-green-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {lead.status || "pending"}
                    </span>
                  </TableCell>
                  <TableCell className="py-2">
                    {lead.created_at ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true }) : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default Leads;