import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
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
import { Search, Plus, Calendar, User, Grid3X3, List, MessageCircle, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import ProjectForm from "@/components/projects/project-form";
import ProjectComments from "@/components/projects/project-comments";
import type { Project, Contact } from "@shared/schema";

export default function Projects() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [commentsProject, setCommentsProject] = useState<Project | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'family' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    enabled: isAuthenticated,
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: isAuthenticated,
  });

  // Query for comment counts for all projects
  const { data: projectCommentCounts = {} } = useQuery<Record<number, number>>({
    queryKey: ['/api/projects/comment-counts'],
    enabled: isAuthenticated && !!projects,
    queryFn: async () => {
      if (!projects) return {};
      
      const counts: Record<number, number> = {};
      await Promise.all(
        projects.map(async (project) => {
          try {
            const response = await fetch(`/api/projects/${project.id}/comments`, {
              credentials: 'include',
            });
            if (response.ok) {
              const comments = await response.json();
              counts[project.id] = comments.length;
            }
          } catch (error) {
            counts[project.id] = 0;
          }
        })
      );
      return counts;
    },
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

  // Filter and sort projects
  const filteredAndSortedProjects = projects?.filter((project) =>
    searchQuery === "" ||
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    let aValue: string | number | Date;
    let bValue: string | number | Date;
    
    switch (sortBy) {
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
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  }) || [];

  const handleSort = (column: 'name' | 'family' | 'date') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: 'name' | 'family' | 'date') => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const handleProjectCreated = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    queryClient.invalidateQueries({ queryKey: ['/api/projects/comment-counts'] });
    toast({
      title: "Projects refreshed",
      description: "Project data has been updated",
    });
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
      <main className="flex-1 overflow-y-auto bg-gray-50">
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              
              {/* Sort Controls */}
              <div className="flex rounded-md border border-gray-200 overflow-hidden">
                <Button
                  variant={sortBy === 'name' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSort('name')}
                  className="rounded-none flex items-center gap-1"
                >
                  Name {getSortIcon('name')}
                </Button>
                <Button
                  variant={sortBy === 'family' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSort('family')}
                  className="rounded-none flex items-center gap-1"
                >
                  Family {getSortIcon('family')}
                </Button>
                <Button
                  variant={sortBy === 'date' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleSort('date')}
                  className="rounded-none flex items-center gap-1"
                >
                  Date {getSortIcon('date')}
                </Button>
              </div>
              
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
                          alt={getFamilyName(project.clientId)}
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
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{project.progress || 0}%</span>
                      </div>
                      <Progress value={project.progress || 0} className="h-6" />
                    </div>
                    
                    <div className="flex items-center justify-end pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCommentsProject(project)}
                        className="text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Comments
                        {projectCommentCounts[project.id] > 0 && (
                          <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {projectCommentCounts[project.id]}
                          </span>
                        )}
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
                    <TableHead>Project Name</TableHead>
                    <TableHead>Family Name</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Meeting Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedProjects.map((project) => (
                    <TableRow key={project.id}>
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
                            <div className="text-sm text-gray-600 mt-1">{project.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {getClientContact(project.clientId)?.profileImageUrl ? (
                            <img 
                              src={getClientContact(project.clientId)?.profileImageUrl} 
                              alt={getFamilyName(project.clientId)}
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
                        <div className="flex items-center gap-2">
                          <Progress value={project.progress || 0} className="h-2 w-20" />
                          <span className="text-sm">{project.progress || 0}%</span>
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
                          {projectCommentCounts[project.id] > 0 && (
                            <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {projectCommentCounts[project.id]}
                            </span>
                          )}
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
