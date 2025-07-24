import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";

import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Plus, Calendar, User, Grid3X3, List, MessageCircle, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import ProjectForm from "@/components/projects/project-form";
import ProjectComments from "@/components/projects/project-comments";
import type { Project, Contact } from "@shared/schema";

export default function Projects() {

  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const [commentsProject, setCommentsProject] = useState<Project | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'family' | 'date' | null;
    direction: 'asc' | 'desc';
  }>({ key: 'name', direction: 'asc' });
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');


  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading]);

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute 
    gcTime: 300000, // 5 minutes
  });

  // Helper functions
  const getProjectStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFamilyName = (clientId: number | null) => {
    if (!clientId || !contacts) return 'No family assigned';
    const client = contacts.find(c => c.id === clientId);
    return client ? (client.familyName || `${client.firstName} ${client.lastName}`) : 'Unknown family';
  };

  const getClientContact = (clientId: number | null) => {
    if (!clientId || !contacts) return null;
    return contacts.find(c => c.id === clientId);
  };

  const handleSort = (column: 'name' | 'family' | 'date') => {
    if (sortConfig.key === column) {
      setSortConfig({
        key: column,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ key: column, direction: 'asc' });
    }
  };

  const getSortIcon = (column: 'name' | 'family' | 'date') => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-4 h-4" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getDateRangeFilter = () => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    switch (dateRange) {
      case 'today':
        return {
          start: startOfToday,
          end: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
        };
      case 'this-week':
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(startOfToday);
        monday.setDate(today.getDate() - daysToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: monday, end: sunday };
      case 'next-week':
        const nextWeekStart = new Date(startOfToday);
        nextWeekStart.setDate(today.getDate() + (7 - today.getDay() + 1));
        const nextWeekEnd = new Date(nextWeekStart);
        nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
        return { start: nextWeekStart, end: nextWeekEnd };
      case 'next-30-days':
        return {
          start: startOfToday,
          end: new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000)
        };
      case 'next-four-months':
        return {
          start: startOfToday,
          end: new Date(startOfToday.getTime() + 122 * 24 * 60 * 60 * 1000)
        };
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            start: new Date(customStartDate),
            end: new Date(customEndDate + 'T23:59:59')
          };
        }
        return null;
      default:
        return null;
    }
  };

  // Filter and sort projects with useMemo for performance
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];
    
    const searchLower = searchQuery.toLowerCase();
    
    return projects.filter((project) => {
      // Text search filter - early return for empty search
      if (searchQuery !== "") {
        const matchesSearch = project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Date range filter
      if (dateRange === 'all') return true;
      
      const range = getDateRangeFilter();
      if (!range || !project.dueDate) return dateRange === 'all';
      
      const projectDate = new Date(project.dueDate);
      return projectDate >= range.start && projectDate <= range.end;
    }).sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (sortConfig.key) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'family':
          aValue = getFamilyName(a.clientId).toLowerCase();
          bValue = getFamilyName(b.clientId).toLowerCase();
          break;
        case 'date':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, searchQuery, dateRange, sortConfig, customStartDate, customEndDate, contacts]);



  const handleProjectCreated = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };



  if (isLoading || projectsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Projects" 
        subtitle="Manage your client projects and track progress"
        showActions={false}
      />
      <main className="flex-1 bg-gray-50">
        <div className="px-6 py-6">
          {/* Search and Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-4">
              {/* Date Range Filter */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Date Range:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      {dateRange === 'all' && 'All Projects'}
                      {dateRange === 'today' && 'Today'}
                      {dateRange === 'this-week' && 'This Week'}
                      {dateRange === 'next-week' && 'Next Week'}
                      {dateRange === 'next-30-days' && 'Next 30 Days'}
                      {dateRange === 'next-four-months' && 'Next Four Months'}
                      {dateRange === 'custom' && 'Custom Range'}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDateRange('all')}>
                      All Projects
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateRange('today')}>
                      Today
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateRange('this-week')}>
                      This Week
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateRange('next-week')}>
                      Next Week
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateRange('next-30-days')}>
                      Next 30 Days
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateRange('next-four-months')}>
                      Next Four Months
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDateRange('custom')}>
                      Custom Date Range
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Custom Date Range Inputs */}
              {dateRange === 'custom' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="text-xs">
                      <Calendar className="w-4 h-4 mr-2" />
                      Set Dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Start Date</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Date</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {/* View Mode Toggle */}
              <div className="flex rounded-md border border-gray-200 overflow-hidden">
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                  className="rounded-none"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-none"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Schedule New Meeting</DialogTitle>
                  </DialogHeader>
                  <ProjectForm onSuccess={handleProjectCreated} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Projects Display */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        <Link 
                          href={`/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {project.name}
                        </Link>
                      </CardTitle>
                    </div>
                    {project.description && (
                      <p className="text-sm text-gray-600 mt-2">{project.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      {getClientContact(project.clientId)?.profileImageUrl ? (
                        <img 
                          src={getClientContact(project.clientId)?.profileImageUrl} 
                          alt={getFamilyName(project.clientId) || ""}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                      )}
                      {project.clientId ? (
                        <Link 
                          href={`/contacts/${project.clientId}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {getFamilyName(project.clientId)}
                        </Link>
                      ) : (
                        <span>{getFamilyName(project.clientId)}</span>
                      )}
                    </div>
                    
                    {project.dueDate && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Meeting: {new Date(project.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-end pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCommentsProject(project)}
                        className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Comments
                      </Button>
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
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none text-xs"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Project Name {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none text-xs"
                      onClick={() => handleSort('family')}
                    >
                      <div className="flex items-center gap-2">
                        Family Name {getSortIcon('family')}
                      </div>
                    </TableHead>

                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 select-none text-xs"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center gap-2">
                        Meeting Date {getSortIcon('date')}
                      </div>
                    </TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project) => (
                    <TableRow key={project.id} className="text-xs">
                      <TableCell className="font-medium">
                        <div>
                          <div className="font-semibold">
                            <Link 
                              href={`/projects/${project.id}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {project.name}
                            </Link>
                          </div>
                          {project.description && (
                            <div className="text-gray-600 mt-1">{project.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {getClientContact(project.clientId)?.profileImageUrl ? (
                            <img 
                              src={getClientContact(project.clientId)?.profileImageUrl} 
                              alt={getFamilyName(project.clientId) || ""}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          {project.clientId ? (
                            <Link 
                              href={`/contacts/${project.clientId}`}
                              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                            >
                              {getFamilyName(project.clientId)}
                            </Link>
                          ) : (
                            <span>{getFamilyName(project.clientId)}</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCommentsProject(project)}
                          className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Comments
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filteredAndSortedProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No projects found matching your criteria.</p>
            </div>
          )}
        </div>
      </main>

      {/* Project Comments Dialog */}
      {commentsProject && (
        <ProjectComments
          projectId={commentsProject.id}
          projectName={commentsProject.name}
          isOpen={!!commentsProject}
          onClose={() => setCommentsProject(null)}
        />
      )}
    </>
  );
}
