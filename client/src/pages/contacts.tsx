import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Link, useSearch } from "wouter";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, Mail, Phone, Building, Grid, List, MoreHorizontal, Edit, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import ContactForm from "@/components/contacts/contact-form";
import type { Contact } from "@shared/schema";

export default function Contacts() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleTypes, setVisibleTypes] = useState({
    client: true,
    prospect: true,
    team_member: true,
    strategic_partner: true
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'rows'>('cards');
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Contact | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });

  const searchString = useSearch();

  // Restore state from localStorage on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const hasUrlParams = urlParams.toString().length > 0;
    
    // Only restore from localStorage if there are no URL parameters
    if (!hasUrlParams) {
      const savedState = localStorage.getItem('contactsPageState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          if (state.visibleTypes) setVisibleTypes(state.visibleTypes);
          if (state.viewMode) setViewMode(state.viewMode);
          if (state.sortConfig) setSortConfig(state.sortConfig);
          if (state.searchQuery) setSearchQuery(state.searchQuery);
        } catch (error) {
          console.error('Error restoring contacts page state:', error);
        }
      }
    }
  }, [searchString]);
  
  // Handle URL query parameters for contact type filtering
  useEffect(() => {
    const urlParams = new URLSearchParams(searchString);
    const typeParam = urlParams.get('type');
    const typesParam = urlParams.get('types');
    const viewParam = urlParams.get('view');
    const sortParam = urlParams.get('sort');
    const sortDirParam = urlParams.get('sortDir');
    const searchParam = urlParams.get('search');
    
    // Only apply URL parameters if they exist
    if (typeParam || typesParam || viewParam || sortParam || searchParam) {
      // Handle types filter
      if (typesParam) {
        const selectedTypes = typesParam.split(',');
        setVisibleTypes({
          client: selectedTypes.includes('client'),
          prospect: selectedTypes.includes('prospect'),
          team_member: selectedTypes.includes('team_member'),
          strategic_partner: selectedTypes.includes('strategic_partner')
        });
      } else if (typeParam && ['client', 'prospect', 'team_member', 'strategic_partner'].includes(typeParam)) {
        // Show only the selected type from URL (legacy support)
        setVisibleTypes({
          client: typeParam === 'client',
          prospect: typeParam === 'prospect',
          team_member: typeParam === 'team_member',
          strategic_partner: typeParam === 'strategic_partner'
        });
      }
      
      // Handle view mode
      if (viewParam === 'rows') {
        setViewMode('rows');
      }
      
      // Handle sort configuration
      if (sortParam && sortDirParam) {
        setSortConfig({
          key: sortParam as keyof Contact,
          direction: sortDirParam as 'asc' | 'desc'
        });
      }
      
      // Handle search query
      if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, [searchString]);

  // Get the current filtered type from URL
  const getCurrentFilteredType = () => {
    const urlParams = new URLSearchParams(searchString);
    return urlParams.get('type');
  };

  // Build URL with current state for back navigation
  const buildContactsUrl = () => {
    const params = new URLSearchParams();
    
    // Add active type filters
    const activeTypes = Object.entries(visibleTypes)
      .filter(([_, isVisible]) => isVisible)
      .map(([type]) => type);
    
    if (activeTypes.length > 0 && activeTypes.length < 4) {
      // Only add type param if not all types are visible
      params.set('types', activeTypes.join(','));
    }
    
    // Add view mode
    if (viewMode !== 'cards') {
      params.set('view', viewMode);
    }
    
    // Add sort config
    if (sortConfig.key) {
      params.set('sort', sortConfig.key);
      params.set('sortDir', sortConfig.direction);
    }
    
    // Add search query
    if (searchQuery) {
      params.set('search', searchQuery);
    }
    
    return params.toString() ? `/contacts?${params.toString()}` : '/contacts';
  };

  // Get page title and subtitle based on filtered type
  const getPageTitleAndSubtitle = () => {
    const currentType = getCurrentFilteredType();
    switch (currentType) {
      case 'client':
        return { title: 'Clients', subtitle: 'Manage your active clients and their information' };
      case 'prospect':
        return { title: 'Prospects', subtitle: 'Track potential clients and opportunities' };
      case 'team_member':
        return { title: 'Team Members', subtitle: 'Manage your team and internal contacts' };
      case 'strategic_partner':
        return { title: 'Strategic Partners', subtitle: 'Manage partnerships and strategic relationships' };
      default:
        return { title: 'Contacts', subtitle: 'Manage your clients, prospects, team members, and strategic partners' };
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isAuthenticated,
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: number) => {
      await apiRequest('DELETE', `/api/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    },
  });

  const filteredContacts = contacts?.filter((contact) => {
    // Filter by visible types
    const isTypeVisible = visibleTypes[contact.contactType as keyof typeof visibleTypes];
    
    // Filter by search query
    const matchesSearch = searchQuery === "" ||
      contact.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.familyName && contact.familyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.personalEmail && contact.personalEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (contact.spousePersonalEmail && contact.spousePersonalEmail.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return isTypeVisible && matchesSearch;
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    // Convert to strings for comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (aStr < bStr) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aStr > bStr) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  }) || [];

  const toggleContactType = (type: keyof typeof visibleTypes) => {
    setVisibleTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      visibleTypes,
      viewMode,
      sortConfig,
      searchQuery
    };
    localStorage.setItem('contactsPageState', JSON.stringify(state));
  }, [visibleTypes, viewMode, sortConfig, searchQuery]);

  const getContactTypeLabel = (type: string) => {
    switch (type) {
      case 'client':
        return 'Clients';
      case 'prospect':
        return 'Prospects';
      case 'team_member':
        return 'Team Members';
      case 'strategic_partner':
        return 'Strategic Partners';
      default:
        return type;
    }
  };

  const formatContactType = (type: string) => {
    switch (type) {
      case 'client':
        return 'Client';
      case 'prospect':
        return 'Prospect';
      case 'team_member':
        return 'Team Member';
      case 'strategic_partner':
        return 'Strategic Partner';
      default:
        return type;
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'inactive':
        return 'Inactive';
      case 'follow_up':
        return 'Follow Up';
      case 'converted':
        return 'Converted';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'prospect':
        return 'bg-amber-100 text-amber-800';
      case 'team_member':
        return 'bg-green-100 text-green-800';
      case 'strategic_partner':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'converted':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRole = (role: string) => {
    switch (role) {
      case 'accountant':
        return 'Accountant';
      case 'admin_assistant':
        return 'Admin Assistant';
      case 'deliverables_team_coordinator':
        return 'Deliverables Team Coordinator';
      case 'estate_planner':
        return 'Estate Planner';
      case 'financial_planner':
        return 'Financial Planner';
      case 'human_relations':
        return 'Human Relations';
      case 'insurance_business':
        return 'Insurance - Business';
      case 'insurance_health':
        return 'Insurance - Health';
      case 'insurance_life_ltc_disability':
        return 'Insurance - Life, LTC, & Disability';
      case 'insurance_pc':
        return 'Insurance - P&C';
      case 'money_manager':
        return 'Money Manager';
      case 'tax_planner':
        return 'Tax Planner';
      case 'trusted_advisor':
        return 'Trusted Advisor';
      case 'other':
        return 'Other';
      default:
        return role?.charAt(0).toUpperCase() + role?.slice(1) || '';
    }
  };

  const handleContactCreated = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  };

  const handleContactUpdated = () => {
    setEditingContact(null);
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  };

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
    setDeleteConfirmText("");
  };

  const handleDeleteConfirm = () => {
    if (contactToDelete && deleteConfirmText === "DELETE") {
      deleteContactMutation.mutate(contactToDelete.id);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      setDeleteConfirmText("");
    }
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
  };

  const handleSort = (key: keyof Contact) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: keyof Contact) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
  };

  if (isLoading || contactsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { title, subtitle } = getPageTitleAndSubtitle();

  return (
    <>
      <Header 
        title={title} 
        subtitle={subtitle}
        showActions={false}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          {/* Search and Filter Bar */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Search and New Contact Button */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                  </DialogHeader>
                  <ContactForm onSuccess={handleContactCreated} />
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Category Toggles and View Options */}
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-gray-700 flex items-center mr-2">Show:</span>
                {/* Reordered buttons: Clients, Prospects, Strategic Partners, Team Members */}
                {['client', 'prospect', 'strategic_partner', 'team_member'].map((type) => (
                  <Toggle
                    key={type}
                    pressed={visibleTypes[type as keyof typeof visibleTypes]}
                    onPressedChange={() => toggleContactType(type as keyof typeof visibleTypes)}
                    variant="outline"
                    className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-800"
                  >
                    {getContactTypeLabel(type)}
                  </Toggle>
                ))}
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <div className="flex rounded-lg border">
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className="rounded-r-none"
                  >
                    <Grid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'rows' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('rows')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Contacts Display */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContacts.map((contact) => (
                <Card key={contact.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={contact.profileImageUrl || ""} alt={`${contact.firstName} ${contact.lastName}`} />
                          <AvatarFallback>
                            {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg">
                            <Link href={`/contacts/${contact.id}`} className="hover:text-blue-600 hover:underline cursor-pointer">
                              {contact.familyName || `${contact.firstName} ${contact.lastName}`}
                            </Link>
                          </CardTitle>
                          {contact.company && (
                            <p className="text-sm text-gray-600">{contact.company}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getContactTypeColor(contact.contactType)}>
                          {formatContactType(contact.contactType)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(contact.spousePersonalEmail || contact.personalEmail) && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{contact.spousePersonalEmail || contact.personalEmail}</span>
                      </div>
                    )}
                    {(contact.spouseCellPhone || contact.cellPhone) && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{contact.spouseCellPhone || contact.cellPhone}</span>
                      </div>
                    )}
                    {contact.position && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building className="w-4 h-4" />
                        <span>{contact.position}</span>
                      </div>
                    )}
                    {/* Role for Team Members and Strategic Partners */}
                    {(contact.contactType === 'team_member' || contact.contactType === 'strategic_partner') && contact.role && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Building className="w-4 h-4" />
                        <span>{formatRole(contact.role)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <Badge variant="outline" className={getContactStatusColor(contact.status || 'active')}>
                        {formatStatus(contact.status || 'active')}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditClick(contact)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(contact)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('familyName')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Name
                        {getSortIcon('familyName')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('contactType')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Type
                        {getSortIcon('contactType')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('personalEmail')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Email
                        {getSortIcon('personalEmail')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('cellPhone')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Phone
                        {getSortIcon('cellPhone')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('role')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Role
                        {getSortIcon('role')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('status')}
                        className="h-auto p-0 font-medium hover:bg-transparent"
                      >
                        Status
                        {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={contact.profileImageUrl || ""} alt={`${contact.firstName} ${contact.lastName}`} />
                            <AvatarFallback className="text-xs">
                              {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link href={`/contacts/${contact.id}`} className="hover:text-blue-600 hover:underline cursor-pointer font-medium">
                              {contact.familyName || `${contact.firstName} ${contact.lastName}`}
                            </Link>
                            {contact.company && (
                              <p className="text-sm text-gray-600">{contact.company}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getContactTypeColor(contact.contactType)}>
                          {formatContactType(contact.contactType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {(contact.spousePersonalEmail || contact.personalEmail) && (
                            <>
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{contact.spousePersonalEmail || contact.personalEmail}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {(contact.spouseCellPhone || contact.cellPhone) && (
                            <>
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-sm">{contact.spouseCellPhone || contact.cellPhone}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(contact.contactType === 'team_member' || contact.contactType === 'strategic_partner') && contact.role ? (
                          <span className="text-sm text-gray-600">{formatRole(contact.role)}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getContactStatusColor(contact.status || 'active')}>
                          {formatStatus(contact.status || 'active')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(contact)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(contact)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No contacts found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <ContactForm 
              contact={editingContact} 
              onSuccess={handleContactUpdated} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {contactToDelete?.familyName || `${contactToDelete?.firstName} ${contactToDelete?.lastName}`}? 
              This action cannot be undone.
              <br /><br />
              Type <strong>DELETE</strong> to confirm:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setContactToDelete(null);
              setDeleteConfirmText("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmText !== "DELETE" || deleteContactMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteContactMutation.isPending ? "Deleting..." : "Delete Contact"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
