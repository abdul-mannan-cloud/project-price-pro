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
import { MapPin, ArrowUp, ArrowDown, Search, Download, Trash2, Filter, Phone, Mail, User, Calendar, DollarSign, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Json } from "@/integrations/supabase/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Status = keyof typeof statusColors;

type SortField = 'projectTitle' | 'address' | 'estimatedCost' | 'status' | 'createdAt' | 'userName' | 'userEmail' | 'userPhone';
type SortDirection = 'asc' | 'desc';

export interface EstimateGroup {
  name: string;
  description?: string;
  subgroups: {
    name: string;
    items: {
      title: string;
      description?: string;
      quantity: number;
      unit?: string;
      unitAmount: number;
      totalPrice: number;
    }[];
    subtotal: number;
  }[];
}

export interface EstimateData {
  groups?: EstimateGroup[];
  projectSummary?: string;
  [key: string]: any; // Add index signature to make it compatible with Json type
}

export interface Lead {
  id: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  project_description?: string;
  project_title: string;
  category?: string;
  status: string;
  estimated_cost?: number;
  project_address?: string;
  estimate_data?: any;
  answers?: any;
  contractor_id?: string;
  created_at?: string;
  updated_at?: string;
  image_url?: string;
  project_images?: string[];
  error_message?: string;
  error_timestamp?: string;
}

interface LeadsTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDeleteLeads: (leadIds: string[]) => void;
  onExport: (filteredLeads: Lead[]) => void;
  updateLead: any;
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  completed: "bg-green-100 text-green-800",
  complete: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  "in-progress": "bg-blue-100 text-blue-800"
} as const;

export const LeadsTable = ({ leads,updateLead, onLeadClick, onDeleteLeads, onExport }: LeadsTableProps) => {
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedMobileLead, setSelectedMobileLead] = useState<Lead | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    dateRange: 'all',
    costRange: 'all',
  });

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

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      updateLead({ id: leadId, status: newStatus });

      toast({
        title: "Status updated",
        description: `Lead status has been changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update lead status",
        variant: "destructive",
      });
    }
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
      <div className="flex justify-between items-center gap-4">
        <div className="form-group flex-1 max-w-md mb-0 relative">
          <Search className="absolute left-3 top-[50%] -translate-y-[50%] h-4 w-4 text-muted-foreground pointer-events-none z-10" />
          <input
            type="text"
            id="search-leads"
            className="form-input pl-10"
            placeholder=" "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label htmlFor="search-leads" className="form-label pl-10">
            Search Leads
          </label>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {['pending', 'in-progress', 'completed', 'cancelled'].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.status.includes(status)}
                  onCheckedChange={(checked) => {
                    setFilters(prev => ({
                      ...prev,
                      status: checked 
                        ? [...prev.status, status]
                        : prev.status.filter(s => s !== status)
                    }));
                  }}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Date Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' }
              ].map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.dateRange === option.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilters(prev => ({ ...prev, dateRange: option.value }));
                    }
                  }}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Cost Range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { value: 'all', label: 'All' },
                { value: 'under1k', label: 'Under $1,000' },
                { value: '1k-5k', label: '$1,000 - $5,000' },
                { value: '5k-10k', label: '$5,000 - $10,000' },
                { value: 'over10k', label: 'Over $10,000' }
              ].map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.costRange === option.value}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setFilters(prev => ({ ...prev, costRange: option.value }));
                    }
                  }}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedLeads.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDeleteLeads(selectedLeads)}
              className="h-10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportClick}
            className="h-10"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-md border bg-white">
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
                  ${lead.estimate_data?.totalCost || "0"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        className="p-0 h-auto hover:bg-transparent"
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
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {Object.keys(statusColors).map((status) => (
                        <DropdownMenuItem
                          key={status}
                          className="flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(lead.id, status);
                          }}
                        >
                          {lead.status === status && (
                            <Check className="h-4 w-4" />
                          )}
                          <Badge 
                            variant="outline"
                            className={cn(
                              "font-normal",
                              statusColors[status as Status]
                            )}
                          >
                            {status}
                          </Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
