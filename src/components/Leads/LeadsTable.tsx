import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { MapPin, ArrowUp, ArrowDown, Search, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "in-progress": "bg-blue-100 text-blue-800"
} as const;

type Status = keyof typeof statusColors;

type SortField = 'projectTitle' | 'address' | 'estimatedCost' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface Lead {
  id: string;
  project_title: string;
  project_address: string | null;
  estimated_cost: number | null;
  status: string | null;
  created_at: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
}

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDeleteLeads: (leadIds: string[]) => void;
  onExport: (filteredLeads: Lead[]) => void;
}

export const LeadsTable = ({ leads, onLeadClick, onDeleteLeads, onExport }: LeadsTableProps) => {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    }
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const openGoogleMaps = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const formatDate = (date: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const leadDate = new Date(date);
    
    if (leadDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (leadDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(leadDate, 'MMM d, yyyy');
    }
  };

  const filteredLeads = leads
    .filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lead.project_title?.toLowerCase().includes(searchLower) ||
        lead.project_address?.toLowerCase().includes(searchLower) ||
        lead.user_name?.toLowerCase().includes(searchLower) ||
        lead.user_email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'projectTitle':
          comparison = (a.project_title || '').localeCompare(b.project_title || '');
          break;
        case 'address':
          comparison = (a.project_address || '').localeCompare(b.project_address || '');
          break;
        case 'estimatedCost':
          comparison = (a.estimated_cost || 0) - (b.estimated_cost || 0);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'createdAt':
          comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          {selectedLeads.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDeleteLeads(selectedLeads)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport(filteredLeads)}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <Checkbox
                  checked={selectedLeads.length === filteredLeads.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead onClick={() => handleSort('projectTitle')} className="cursor-pointer">
                Project Title
                {sortField === 'projectTitle' && (
                  sortDirection === 'asc' ? <ArrowUp className="inline ml-1 w-4 h-4" /> : <ArrowDown className="inline ml-1 w-4 h-4" />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort('address')} className="cursor-pointer">
                Address
                {sortField === 'address' && (
                  sortDirection === 'asc' ? <ArrowUp className="inline ml-1 w-4 h-4" /> : <ArrowDown className="inline ml-1 w-4 h-4" />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort('estimatedCost')} className="cursor-pointer text-right">
                Estimated Cost
                {sortField === 'estimatedCost' && (
                  sortDirection === 'asc' ? <ArrowUp className="inline ml-1 w-4 h-4" /> : <ArrowDown className="inline ml-1 w-4 h-4" />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort('status')} className="cursor-pointer">
                Status
                {sortField === 'status' && (
                  sortDirection === 'asc' ? <ArrowUp className="inline ml-1 w-4 h-4" /> : <ArrowDown className="inline ml-1 w-4 h-4" />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort('createdAt')} className="cursor-pointer">
                Created
                {sortField === 'createdAt' && (
                  sortDirection === 'asc' ? <ArrowUp className="inline ml-1 w-4 h-4" /> : <ArrowDown className="inline ml-1 w-4 h-4" />
                )}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onLeadClick(lead)}
              >
                <TableCell className="w-[30px]" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedLeads.includes(lead.id)}
                    onCheckedChange={() => handleSelectLead(lead.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {lead.project_title}
                </TableCell>
                <TableCell>
                  {lead.project_address && (
                    <Button
                      variant="ghost"
                      className="p-0 h-auto hover:bg-transparent"
                      onClick={(e) => openGoogleMaps(lead.project_address!, e)}
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      {lead.project_address}
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  ${lead.estimated_cost?.toLocaleString() || "0"}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "font-normal",
                      statusColors[lead.status as Status] || statusColors.pending
                    )}
                  >
                    {lead.status || "pending"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {lead.created_at ? formatDate(lead.created_at) : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};