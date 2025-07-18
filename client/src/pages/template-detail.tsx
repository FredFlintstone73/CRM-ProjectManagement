import { useEffect, useState } from "react";
import { useParams } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Calendar,
  Users,
  Edit2,
  Check,
  X
} from "lucide-react";
import { Link } from "wouter";
import type { ProjectTemplate } from "@shared/schema";

interface TemplateDetailParams {
  id: string;
}

interface TaskTemplate {
  id: number;
  name: string;
  description: string;
  estimatedDays: number;
  daysFromMeeting: number;
  parentTaskId?: number | null;
  assignedTo?: string | null;
  comments: string;
  subtasks?: TaskTemplate[];
}

// Create hierarchical task structure using actual parentTaskId
const buildTaskHierarchy = (tasks: TaskTemplate[]) => {
  // Create a map for quick lookup
  const taskMap = new Map<number, TaskTemplate>();
  
  // Initialize all tasks with empty subtasks array
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, subtasks: [] });
  });
  
  // Build hierarchy by linking children to parents
  const rootTasks: TaskTemplate[] = [];
  
  tasks.forEach(task => {
    const currentTask = taskMap.get(task.id)!;
    
    if (task.parentTaskId === null || task.parentTaskId === undefined) {
      // Root level task
      rootTasks.push(currentTask);
    } else {
      // Child task - add to parent's subtasks
      const parentTask = taskMap.get(task.parentTaskId);
      if (parentTask) {
        if (!parentTask.subtasks) parentTask.subtasks = [];
        parentTask.subtasks.push(currentTask);
      } else {
        // If parent not found, treat as root task
        rootTasks.push(currentTask);
      }
    }
  });
  
  return rootTasks;
};



// TaskDisplay component for recursive task rendering
const TaskDisplay = ({ task, templateId, level = 0 }: { task: TaskTemplate, templateId: string | undefined, level?: number }) => {
  const indentClass = level === 0 ? '' : level === 1 ? 'ml-6' : level === 2 ? 'ml-12' : 'ml-16';
  const bgClass = level === 0 ? 'bg-white' : level === 1 ? 'bg-gray-50 border-l-4 border-l-blue-200' : level === 2 ? 'bg-gray-25 border-l-4 border-l-green-200' : 'bg-white border-l-4 border-l-purple-200';
  
  return (
    <div className={`space-y-2 ${indentClass}`}>
      <div className={`border rounded-lg p-4 ${bgClass}`}>
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-medium text-gray-900">
            {task.name}
          </h4>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mt-2">{task.description}</p>
        )}
      </div>
      
      {/* Render subtasks recursively */}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="space-y-2">
          {task.subtasks.map((subtask) => (
            <TaskDisplay 
              key={subtask.id} 
              task={subtask} 
              templateId={templateId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function TemplateDetail() {
  const { id } = useParams<TemplateDetailParams>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [openPhases, setOpenPhases] = useState<string[]>([]);
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");

  // Mutation to update milestone title
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, title }: { milestoneId: number; title: string }) => {
      return await apiRequest('PUT', `/api/milestones/${milestoneId}`, { title });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Section name updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      setEditingMilestone(null);
      setEditingTitle("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update section name",
        variant: "destructive",
      });
    },
  });

  const startEditing = (milestone: any) => {
    setEditingMilestone(milestone.id);
    setEditingTitle(milestone.title);
  };

  const saveEditing = () => {
    if (editingMilestone && editingTitle.trim()) {
      updateMilestoneMutation.mutate({ 
        milestoneId: editingMilestone, 
        title: editingTitle.trim() 
      });
    }
  };

  const cancelEditing = () => {
    setEditingMilestone(null);
    setEditingTitle("");
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

  const { data: template, isLoading: templateLoading, error } = useQuery<ProjectTemplate>({
    queryKey: ['/api/project-templates', id],
    queryFn: async () => {
      const response = await fetch(`/api/project-templates/${id}`);
      if (!response.ok) throw new Error('Failed to fetch template');
      return response.json();
    },
    enabled: isAuthenticated && !!id,
  });

  // Fetch template milestones and tasks
  const { data: milestones = [] } = useQuery({
    queryKey: ['/api/milestones', { templateId: id }],
    queryFn: async () => {
      const response = await fetch(`/api/milestones?templateId=${id}`);
      if (!response.ok) throw new Error('Failed to fetch milestones');
      return response.json();
    },
    enabled: isAuthenticated && !!id,
  });

  // Fetch all tasks for the template milestones
  const { data: allTasks = [] } = useQuery({
    queryKey: ['/api/template-tasks', id],
    queryFn: async () => {
      if (!milestones.length) return [];
      
      const taskPromises = milestones.map(async (milestone: any) => {
        const response = await fetch(`/api/milestones/${milestone.id}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const tasks = await response.json();
        return tasks.map((task: any) => ({ ...task, milestone }));
      });
      
      const taskArrays = await Promise.all(taskPromises);
      return taskArrays.flat();
    },
    enabled: isAuthenticated && milestones.length > 0,
  });

  if (error && isUnauthorizedError(error as Error)) {
    toast({
      title: "Unauthorized",
      description: "You are logged out. Logging in again...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  const togglePhase = (phaseName: string) => {
    setOpenPhases(prev => 
      prev.includes(phaseName) 
        ? prev.filter(p => p !== phaseName)
        : [...prev, phaseName]
    );
  };

  if (isLoading || templateLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Template Not Found</h2>
          <p className="text-gray-500 mb-4">The template you're looking for doesn't exist.</p>
          <Link href="/templates">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Process tasks from database - convert to TaskTemplate format
  const tasks: TaskTemplate[] = allTasks.map((task: any) => ({
    id: task.id,
    name: task.title,
    description: task.description || '',
    estimatedDays: 1, // Default value since we don't store this in DB
    daysFromMeeting: 0, // Default value since we don't store this in DB
    parentTaskId: task.parentTaskId,
    assignedTo: null, // Don't show assigned team members for templates
    comments: ''
  }));

  // Group tasks by milestone with milestone metadata
  const tasksByMilestone = new Map<string, { milestone: any, tasks: TaskTemplate[] }>();
  allTasks.forEach((task: any) => {
    const milestoneTitle = task.milestone?.title || 'Uncategorized';
    if (!tasksByMilestone.has(milestoneTitle)) {
      tasksByMilestone.set(milestoneTitle, { milestone: task.milestone, tasks: [] });
    }
    tasksByMilestone.get(milestoneTitle)!.tasks.push({
      id: task.id,
      name: task.title,
      description: task.description || '',
      estimatedDays: 1,
      daysFromMeeting: 0,
      parentTaskId: task.parentTaskId,
      assignedTo: null,
      comments: ''
    });
  });

  const totalTasks = tasks.length;
  const totalDays = tasks.reduce((sum, task) => sum + (task.estimatedDays || 0), 0);

  return (
    <>
      <Header 
        title={template.name}
        subtitle={`${totalTasks} tasks • ${totalDays} estimated days`}
        showActions={false}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/templates">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </div>

          {/* Template Overview */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Template Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">{template.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{totalTasks}</p>
                      <p className="text-sm text-gray-500">Total Tasks</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{totalDays}</p>
                      <p className="text-sm text-gray-500">Estimated Days</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">{milestones.length}</p>
                      <p className="text-sm text-gray-500">Main Milestones</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task Hierarchy */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Template Tasks</h2>
            
            {Array.from(tasksByMilestone.entries()).map(([milestoneTitle, { milestone, tasks: milestoneTasks }], milestoneIndex) => {
              const isOpen = openPhases.includes(milestoneTitle);
              const hierarchicalTasks = buildTaskHierarchy(milestoneTasks);
              const taskCount = milestoneTasks.length;
              const isEditing = editingMilestone === milestone?.id;
              
              return (
                <Card key={milestoneTitle} className="overflow-hidden group">
                  <Collapsible open={isOpen} onOpenChange={() => togglePhase(milestoneTitle)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isOpen ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                            <div className="flex-1">
                              {isEditing ? (
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Input
                                    value={editingTitle}
                                    onChange={(e) => setEditingTitle(e.target.value)}
                                    className="text-lg font-semibold"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        saveEditing();
                                      } else if (e.key === 'Escape') {
                                        cancelEditing();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <Button size="sm" variant="outline" onClick={saveEditing}>
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={cancelEditing}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{milestoneTitle}</CardTitle>
                                  {milestone?.id && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(milestone);
                                      }}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                {taskCount} tasks
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            Section {milestoneIndex + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="space-y-3">
                          {hierarchicalTasks.map((task) => (
                            <TaskDisplay key={task.id} task={task} templateId={id} />
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </>
  );
}