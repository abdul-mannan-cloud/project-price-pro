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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDistanceToNow, format } from "date-fns";
import { MapPin, ArrowUp, ArrowDown, Search, Download, Trash2, Filter, Phone, Mail, User } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "in-progress": "bg-blue-100 text-blue-800"
} as const;

type Status = keyof typeof statusColors;

type SortField = 'projectTitle' | 'address' | 'estimatedCost' | 'status' | 'createdAt' | 'userName' | 'userEmail' | 'userPhone';
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
  estimate_data?: {
    groups?: Array<{
      name: string;
      description?: string;
    }>;
  };
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
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMobileLead, setSelectedMobileLead] = useState<Lead | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);

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

  const handleExportClick = () => {
    setShowExportDialog(true);
  };

  const handleExportConfirm = () => {
    onExport(filteredLeads);
    setShowExportDialog(false);
  };

  const filteredLeads = leads
    .filter(lead => {
      const searchLower = searchTerm.toLowerCase();
      return (
        lead.project_title?.toLowerCase().includes(searchLower) ||
        lead.project_address?.toLowerCase().includes(searchLower) ||
        lead.user_name?.toLowerCase().includes(searchLower) ||
        lead.user_email?.toLowerCase().includes(searchLower) ||
        lead.user_phone?.toLowerCase().includes(searchLower)
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
        case 'userName':
          comparison = (a.user_name || '').localeCompare(b.user_name || '');
          break;
        case 'userEmail':
          comparison = (a.user_email || '').localeCompare(b.user_email || '');
          break;
        case 'userPhone':
          comparison = (a.user_phone || '').localeCompare(b.user_phone || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-8"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          {showFilters && (
            <div className="absolute z-10 mt-2 w-full bg-white rounded-md shadow-lg p-4 space-y-2">
              {/* Add filter options here */}
            </div>
          )}
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
            onClick={handleExportClick}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border">
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
                Project Groups
                {sortField === 'projectTitle' && (
                  sortDirection === 'asc' ? <ArrowUp className="inline ml-1 w-4 h-4" /> : <ArrowDown className="inline ml-1 w-4 h-4" />
                )}
              </TableHead>
              <TableHead onClick={() => handleSort('userName')} className="cursor-pointer">
                Customer
                {sortField === 'userName' && (
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
                  {lead.estimate_data?.groups?.map(group => group.name).join(", ") || lead.project_title}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{lead.user_name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3 h-3" />
                      <a href={`mailto:${lead.user_email}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {lead.user_email}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3 h-3" />
                      <a href={`tel:${lead.user_phone}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
                        {lead.user_phone}
                      </a>
                    </div>
                  </div>
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
                  <Button
                    variant="ghost"
                    className="p-0 h-auto"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add status change handler here
                    }}
                  >
                    <Badge 
                      variant="outline"
                      className={cn(
                        "font-normal cursor-pointer",
                        statusColors[lead.status as Status] || statusColors.pending
                      )}
                    >
                      {lead.status || "pending"}
                    </Badge>
                  </Button>
                </TableCell>
                <TableCell>
                  {lead.created_at ? formatDate(lead.created_at) : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile List */}
      <div className="md:hidden space-y-4">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            className="bg-white rounded-lg shadow p-4 space-y-2 cursor-pointer"
            onClick={() => setSelectedMobileLead(lead)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">
                  {lead.estimate_data?.groups?.map(group => group.name).join(", ") || lead.project_title}
                </h3>
                <p className="text-sm text-muted-foreground">{lead.user_name}</p>
              </div>
              <Badge 
                variant="outline"
                className={cn(
                  "font-normal",
                  statusColors[lead.status as Status] || statusColors.pending
                )}
              >
                {lead.status || "pending"}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {lead.created_at ? formatDate(lead.created_at) : "N/A"}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Lead Dialog */}
      <Dialog open={!!selectedMobileLead} onOpenChange={() => setSelectedMobileLead(null)}>
        <DialogContent className="sm:max-w-[425px]">
          {selectedMobileLead && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">
                {selectedMobileLead.estimate_data?.groups?.map(group => group.name).join(", ") || selectedMobileLead.project_title}
              </h2>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{selectedMobileLead.user_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <a href={`mailto:${selectedMobileLead.user_email}`} className="text-primary hover:underline">
                    {selectedMobileLead.user_email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <a href={`tel:${selectedMobileLead.user_phone}`} className="text-primary hover:underline">
                    {selectedMobileLead.user_phone}
                  </a>
                </div>
                {selectedMobileLead.project_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <Button
                      variant="ghost"
                      className="p-0 h-auto hover:bg-transparent"
                      onClick={(e) => openGoogleMaps(selectedMobileLead.project_address!, e)}
                    >
                      {selectedMobileLead.project_address}
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="font-medium">${selectedMobileLead.estimated_cost?.toLocaleString() || "0"}</p>
                </div>
                <Badge 
                  variant="outline"
                  className={cn(
                    "font-normal",
                    statusColors[selectedMobileLead.status as Status] || statusColors.pending
                  )}
                >
                  {selectedMobileLead.status || "pending"}
                </Badge>
              </div>
              
              <Button 
                className="w-full" 
                onClick={() => {
                  onLeadClick(selectedMobileLead);
                  setSelectedMobileLead(null);
                }}
              >
                View Details
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Export Options</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Export Format</label>
                <select className="w-full border rounded-md p-2">
                  <option value="csv">CSV</option>
                  <option value="excel">Excel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <select className="w-full border rounded-md p-2">
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
              <Button onClick={handleExportConfirm}>Export</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};