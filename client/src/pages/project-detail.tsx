import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, User, Clock, Plus, Edit3, Trash2, CheckCircle, Circle, Settings, ArrowLeft, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import TaskForm from "@/components/tasks/task-form";
import ProjectForm from "@/components/projects/project-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Project, Task, Contact } from "@shared/schema";

interface ProjectDetailParams {
  id: string;
}

export default function ProjectDetail() {
  const { id } = useParams<ProjectDetailParams>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showProjectEdit, setShowProjectEdit] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [sortBy, setSortBy] = useState<'assignee' | 'dueDate'>('assignee');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [newDueDate, setNewDueDate] = useState("");

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['/api/projects', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ['/api/projects', id, 'tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${id}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'tasks'] });
      toast({ title: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'tasks'] });
      toast({ title: "Task updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
      toast({ title: "Project deleted successfully" });
      setLocation('/projects');
    },
    onError: (error: any) => {
      console.error('Delete project error:', error);
      const errorMessage = error.message || "Failed to delete project";
      toast({ 
        title: "Delete Failed", 
        description: errorMessage,
        variant: "destructive" 
      });
    },
  });

  const updateDueDateMutation = useMutation({
    mutationFn: async ({ projectId, dueDate }: { projectId: number; dueDate: string | null }) => {
      const response = await fetch(`/api/projects/${projectId}/update-due-date`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate }),
      });
      if (!response.ok) throw new Error('Failed to update due date');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', id, 'tasks'] });
      setEditingDueDate(false);
      setNewDueDate("");
      toast({ title: "Due date and all task dates updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update due date", variant: "destructive" });
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getFamilyName = (clientId: number | null) => {
    if (!clientId || !contacts) return 'No family assigned';
    const client = contacts.find(c => c.id === clientId);
    return client ? (client.familyName || `${client.firstName} ${client.lastName}`) : 'Unknown family';
  };

  const getAssigneeName = (assignedTo: number | null) => {
    if (!assignedTo || !contacts) return 'Unassigned';
    const assignee = contacts.find(c => c.id === assignedTo);
    if (!assignee) return 'Unknown assignee';
    
    // Add contact type indicator for clarity
    const contactTypeLabel = assignee.contactType === 'team_member' ? '' : ` (${assignee.contactType})`;
    return `${assignee.firstName} ${assignee.lastName}${contactTypeLabel}`;
  };

  const handleTaskCreated = () => {
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleDeleteTask = (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleToggleTask = (taskId: number, isCompleted: boolean) => {
    toggleTaskMutation.mutate({ taskId, completed: !isCompleted });
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
    queryClient.invalidateQueries({ queryKey: ['/api/projects', id] });
    toast({ title: "Project updated successfully" });
  };

  const handleEditDueDate = () => {
    setEditingDueDate(true);
    setNewDueDate(project?.dueDate ? format(new Date(project.dueDate), 'yyyy-MM-dd') : "");
  };

  const handleSaveDueDate = () => {
    if (project) {
      updateDueDateMutation.mutate({ 
        projectId: project.id, 
        dueDate: newDueDate || null 
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

  const sortedTasks = tasks ? [...tasks].sort((a, b) => {
    if (sortBy === 'assignee') {
      const aAssignee = getAssigneeName(a.assignedTo);
      const bAssignee = getAssigneeName(b.assignedTo);
      return aAssignee.localeCompare(bAssignee);
    } else if (sortBy === 'dueDate') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  }) : [];

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
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-600">Project Details & Task Management</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showProjectEdit} onOpenChange={setShowProjectEdit}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Edit Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Project</DialogTitle>
              </DialogHeader>
              <ProjectForm 
                project={project} 
                onSuccess={handleProjectUpdated} 
              />
            </DialogContent>
          </Dialog>
          <Button
            variant="destructive"
            onClick={handleDeleteProject}
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Project
          </Button>
          <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTask(null)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? 'Edit Task' : 'Add New Task'}
                </DialogTitle>
              </DialogHeader>
              <TaskForm
                task={editingTask}
                projectId={parseInt(id!)}
                onSuccess={handleTaskCreated}
              />
            </DialogContent>
          </Dialog>
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
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                Created: {format(new Date(project.createdAt), 'MMM dd, yyyy')}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{currentProgress}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Tasks Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            {tasks && tasks.length > 0 && (
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <Select value={sortBy} onValueChange={(value: 'assignee' | 'dueDate') => setSortBy(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assignee">Assignee</SelectItem>
                    <SelectItem value="dueDate">Due Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!tasks || tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No tasks yet. Add your first task to get started.</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {sortedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 border-b hover:bg-gray-50 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleToggleTask(task.id, task.status === 'completed')}
                        className="text-gray-500 hover:text-primary flex-shrink-0"
                      >
                        {task.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-medium text-sm ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </h3>
                        </div>
                        
                        {task.description && (
                          <p className="text-xs text-gray-600 mb-1 truncate">{task.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Assigned to: {getAssigneeName(task.assignedTo)}</span>
                          {task.dueDate && (
                            <span>Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditTask(task)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}