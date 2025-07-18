import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, FileText, Trash2, MoreHorizontal, Copy, Rocket, Grid3X3, List, ArrowUpDown } from "lucide-react";
import ProjectTemplateForm from "@/components/projects/project-template-form";
import CreateFromTemplateDialog from "@/components/projects/create-from-template-dialog";
import type { ProjectTemplate } from "@shared/schema";
import { Link } from "wouter";

export default function Templates() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProjectTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ProjectTemplate | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'card' | 'row'>('card');

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

  const { data: templates, isLoading: templatesLoading, refetch } = useQuery<ProjectTemplate[]>({
    queryKey: ['/api/project-templates'],
    enabled: isAuthenticated,
    staleTime: 0, // Always fetch fresh data
    cacheTime: 0, // Don't cache
  });

  // Force refresh when authenticated status changes
  useEffect(() => {
    if (isAuthenticated) {
      refetch();
    }
  }, [isAuthenticated, refetch]);

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest('DELETE', `/api/project-templates/${templateId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/project-templates'] });
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
      console.error("Template deletion error:", error);
      toast({
        title: "Error",
        description: `Failed to delete template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const copyTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('POST', `/api/project-templates/${templateId}/copy`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Template copied successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/project-templates'] });
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
      console.error("Template copy error:", error);
      toast({
        title: "Error",
        description: `Failed to copy template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const filteredTemplates = templates?.filter((template) =>
    searchQuery === "" ||
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const comparison = a.name.localeCompare(b.name);
    return sortOrder === 'asc' ? comparison : -comparison;
  }) || [];

  const handleTemplateCreated = () => {
    setIsDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/project-templates'] });
  };

  const handleTemplateUpdated = () => {
    setEditingTemplate(null);
    queryClient.invalidateQueries({ queryKey: ['/api/project-templates'] });
  };

  const handleDeleteClick = (template: ProjectTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const handleEditClick = (template: ProjectTemplate) => {
    setEditingTemplate(template);
  };

  const handleCopyTemplate = (template: ProjectTemplate) => {
    copyTemplateMutation.mutate(template.id);
  };

  // Task count will be fetched separately for each template
  const [taskCounts, setTaskCounts] = useState<Record<number, number>>({});

  // Fetch task counts for all templates
  useEffect(() => {
    const fetchTaskCounts = async () => {
      if (!templates || !isAuthenticated) return;
      
      const counts: Record<number, number> = {};
      
      for (const template of templates) {
        try {
          const response = await fetch(`/api/project-templates/${template.id}/task-count`, {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            counts[template.id] = data.taskCount;
          }
        } catch (error) {
          console.error(`Error fetching task count for template ${template.id}:`, error);
          counts[template.id] = 0;
        }
      }
      
      setTaskCounts(counts);
    };

    fetchTaskCounts();
  }, [templates, isAuthenticated]);

  if (isLoading || templatesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title="Project Templates" 
        subtitle="Create and manage reusable project templates"
        showActions={false}
      />
      
      <main className="flex-1 bg-gray-50">
        <div className="px-6 py-6">
          {/* Search and Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {/* View Toggle */}
              <div className="flex rounded-lg border border-gray-200 p-1">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="px-2 py-1"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'row' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('row')}
                  className="px-2 py-1"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Sort Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="flex items-center gap-1"
              >
                <ArrowUpDown className="w-4 h-4" />
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </Button>
              

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Template</DialogTitle>
                  </DialogHeader>
                  <ProjectTemplateForm onSuccess={handleTemplateCreated} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Templates Display */}
          {templatesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-500 mb-4">
                  {searchQuery ? "No templates match your search." : "Create your first project template to get started."}
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Link href={`/templates/${template.id}`}>
                        <CardTitle className="text-lg line-clamp-1 hover:text-blue-600 transition-colors cursor-pointer">{template.name}</CardTitle>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <CreateFromTemplateDialog template={template}>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Rocket className="h-4 w-4 mr-2" />
                              Create Project
                            </DropdownMenuItem>
                          </CreateFromTemplateDialog>
                          <DropdownMenuItem onClick={() => handleCopyTemplate(template)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(template)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {template.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {taskCounts[template.id] || 0} tasks
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Created {new Date(template.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <Link href={`/templates/${template.id}`}>
                          <h3 className="font-semibold text-lg hover:text-blue-600 transition-colors cursor-pointer">
                            {template.name}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {taskCounts[template.id] || 0} tasks
                          </Badge>
                          {template.meetingType && (
                            <Badge variant="secondary">
                              {template.meetingType.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <CreateFromTemplateDialog template={template}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Rocket className="h-4 w-4 mr-2" />
                                Create Project
                              </DropdownMenuItem>
                            </CreateFromTemplateDialog>
                            <DropdownMenuItem onClick={() => handleCopyTemplate(template)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteClick(template)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-1">
                        {template.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Edit Template Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id === 0 ? 'Copy Template' : 'Edit Template'}
            </DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <ProjectTemplateForm 
              template={editingTemplate.id === 0 ? undefined : editingTemplate} 
              onSuccess={handleTemplateUpdated} 
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template "{templateToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}