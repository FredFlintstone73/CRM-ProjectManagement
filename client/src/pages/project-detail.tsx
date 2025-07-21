import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import { CalendarDays, User, Plus, Edit3, Trash2, Settings, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import TaskForm from "@/components/tasks/task-form";
import ProjectForm from "@/components/projects/project-form";
import { SectionTaskManager } from "@/components/tasks/section-task-manager";
import { TaskDetailSidebar } from "@/components/tasks/task-detail-sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

import type { Project, Task, Contact } from "@shared/schema";

interface ProjectDetailParams {
  id: string;
}

export default function ProjectDetail() {
  const { id } = useParams<ProjectDetailParams>();
  const [, setLocation] = useLocation();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [editingDueDate, setEditingDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Task sidebar state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Handler for opening task in sidebar
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsSidebarOpen(true);
  };

  // Handler for closing sidebar
  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    setSelectedTask(null);
  };

  // Handler for task updates from sidebar - no longer needed with optimistic updates
  const handleTaskUpdate = () => {
    // Cache updates are handled in the sidebar component
  };

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/projects', id, 'tasks', refreshKey],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

  // Update selected task when tasks data changes
  useEffect(() => {
    if (selectedTask && tasks) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
    }
  }, [tasks, selectedTask]);

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Get the specific contact for this project
  const projectContact = contacts?.find(c => c.id === project?.clientId);

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete task');
    },
    onSuccess: (_, taskId) => {
      // Optimistically remove from cache instead of refreshing
      queryClient.setQueryData(['/api/projects', id, 'tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.filter(task => task.id !== taskId);
      });
      
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.filter(task => task.id !== taskId);
      });
    },
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: number; completed: boolean }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: completed ? 'completed' : 'todo' }),
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: (updatedTask) => {
      // Optimistically update cache instead of refreshing
      queryClient.setQueryData(['/api/projects', id, 'tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(task => 
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        );
      });
      
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(task => 
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        );
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest('DELETE', `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      // Remove all cached queries to force fresh data after project deletion
      queryClient.removeQueries({ queryKey: ['/api/projects'] });
      queryClient.removeQueries({ queryKey: ['/api/dashboard/projects-due'] });
      queryClient.removeQueries({ queryKey: ['/api/tasks'] });
      queryClient.removeQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
      queryClient.removeQueries({ queryKey: ['/api/milestones'] });
      queryClient.removeQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.removeQueries({ queryKey: ['/api/projects', projectId.toString(), 'tasks'] });
      queryClient.removeQueries({ queryKey: ['/api/projects', projectId.toString()] });
      
      // Then invalidate to trigger fresh fetches
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });

      setLocation('/projects');
    },
    onError: (error: any) => {
      console.error('Delete project error:', error);
      const errorMessage = error.message || "Failed to delete project";

    },
  });

  const updateDueDateMutation = useMutation({
    mutationFn: async ({ projectId, dueDate }: { projectId: number; dueDate: string | null }) => {
      const response = await apiRequest('PUT', `/api/projects/${projectId}`, { dueDate });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Update successful, data:', data);
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Force refresh by incrementing the refresh key
      setRefreshKey(prev => prev + 1);
      
      setEditingDueDate(false);
      setNewDueDate("");
    },
    onError: () => {

    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'on_hold':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 40) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'; // High priority (40-50)
    if (priority >= 30) return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'; // Medium-high priority (30-39)
    if (priority >= 20) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'; // Medium priority (20-29)
    if (priority >= 10) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'; // Low-medium priority (10-19)
    return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'; // Low priority (1-9)
  };

  const getFamilyName = (clientId: number | null) => {
    if (!clientId || !contacts) return 'No family assigned';
    const client = contacts.find(c => c.id === clientId);
    return client ? (client.familyName || `${client.firstName} ${client.lastName}`) : 'Unknown family';
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleDeleteProject = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (project && deleteConfirmText === "DELETE") {
      deleteProjectMutation.mutate(project.id);
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
    }
  };

  const handleProjectUpdated = () => {
    setShowProjectEdit(false);
    setRefreshKey(prev => prev + 1);

  };

  const handleEditDueDate = () => {
    setEditingDueDate(true);
    if (project?.dueDate) {
      // Format the date directly without timezone conversion
      const date = new Date(project.dueDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      setNewDueDate(`${year}-${month}-${day}`);
    } else {
      setNewDueDate("");
    }
  };

  const handleSaveDueDate = () => {
    if (project) {
      let dueDateToSave = null;
      if (newDueDate) {
        // Create date at noon in local timezone to avoid UTC conversion issues
        const [year, month, day] = newDueDate.split('-').map(Number);
        const localDate = new Date(year, month - 1, day, 12, 0, 0);
        dueDateToSave = localDate.toISOString();
      }
      
      updateDueDateMutation.mutate({ 
        projectId: project.id, 
        dueDate: dueDateToSave 
      });
    }
  };

  const handleDeleteDueDate = () => {
    if (project && confirm('Are you sure you want to remove the due date?')) {
      updateDueDateMutation.mutate({ 
        projectId: project.id, 
        dueDate: null 
      });
    }
  };

  const handleCancelEditDueDate = () => {
    setEditingDueDate(false);
    setNewDueDate("");
  };

  // Calculate progress based on completed tasks
  const calculateProgress = () => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const currentProgress = calculateProgress();



  if (projectLoading || tasksLoading) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 space-y-4 p-4 pt-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Project not found</h1>
          <p className="text-gray-600">The project you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6">
      {/* Project Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/projects')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
          <div>
            <h1 className="font-bold text-gray-900 text-[20px]">{project.name}</h1>
            <p className="text-gray-600">Project Details & Task Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            onClick={handleDeleteProject}
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Project
          </Button>
        </div>
      </div>
      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {project.description && (
            <p className="text-gray-700">{project.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              {projectContact?.profileImageUrl ? (
                <img 
                  src={projectContact.profileImageUrl} 
                  alt={getFamilyName(project.clientId)}
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-500" />
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-gray-900">{getFamilyName(project.clientId)}</span>
                <div className="text-xs text-gray-500">Family</div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-gray-500" />
                {editingDueDate ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-40 h-8"
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveDueDate}
                      disabled={updateDueDateMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelEditDueDate}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      Due: {project.dueDate ? format(new Date(project.dueDate), 'MMM dd, yyyy') : 'No due date set'}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleEditDueDate}
                      className="h-6 w-6 p-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    {project.dueDate && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleDeleteDueDate}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-sm text-gray-600">Progress:</span>
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${currentProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-700">{currentProgress}%</span>
                </div>
              </div>
            </div>
            

          </div>
        </CardContent>
      </Card>
      {/* Section Task Management */}
      <div className="mt-6">
        <SectionTaskManager 
          projectId={project.id}
          onTaskClick={handleTaskClick}
        />
      </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{project?.name}"? This action cannot be undone and will also delete all associated tasks.
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
              setDeleteConfirmText("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmText !== "DELETE" || deleteProjectMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        task={selectedTask}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
        projectId={parseInt(id!)}
        onTaskUpdate={handleTaskUpdate}
        onTaskClick={handleTaskClick}
      />
    </div>
  );
}