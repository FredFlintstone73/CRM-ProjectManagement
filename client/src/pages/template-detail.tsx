import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@radix-ui/react-collapsible";
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  Calendar,
  Users
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
  priority: 'low' | 'medium' | 'high' | 'urgent';
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

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <AlertCircle className="w-4 h-4" />;
    case 'high':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'medium':
      return <Circle className="w-4 h-4" />;
    case 'low':
      return <Circle className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

export default function TemplateDetail() {
  const { id } = useParams<TemplateDetailParams>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [openPhases, setOpenPhases] = useState<string[]>([]);

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

  let tasks: TaskTemplate[] = [];
  try {
    const taskData = typeof template.tasks === 'string' 
      ? JSON.parse(template.tasks) 
      : template.tasks || [];
    
    if (Array.isArray(taskData)) {
      // Use the proper structure from the template
      tasks = taskData.map((task: any) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        priority: task.priority,
        estimatedDays: task.estimatedDays || 1,
        daysFromMeeting: task.daysFromMeeting || 0,
        parentTaskId: task.parentTaskId,
        assignedTo: task.assignedTo,
        comments: task.comments || ''
      }));
    }
  } catch (error) {
    console.error('Error parsing tasks:', error);
    tasks = [];
  }

  const hierarchicalTasks = buildTaskHierarchy(tasks);
  const totalTasks = tasks.length;
  const totalDays = tasks.reduce((sum, task) => sum + (task.estimatedDays || 0), 0);
  
  // Create a global task index mapping for proper routing
  const taskIndexMap = new Map<number, number>();
  
  tasks.forEach((task, index) => {
    taskIndexMap.set(task.id, index);
  });

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
                      <p className="font-medium">{hierarchicalTasks.length}</p>
                      <p className="text-sm text-gray-500">Main Milestones</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Task Hierarchy */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Task Hierarchy</h2>
            
            {hierarchicalTasks.map((task, index) => {
              const isOpen = openPhases.includes(task.name);
              const getTaskCount = (task: TaskTemplate): number => {
                let count = 1;
                if (task.subtasks) {
                  task.subtasks.forEach(subtask => {
                    count += getTaskCount(subtask);
                  });
                }
                return count;
              };
              
              const taskCount = getTaskCount(task);
              const globalIndex = taskIndexMap.get(task.id) || 0;
              
              return (
                <Card key={task.id} className="overflow-hidden">
                  <Collapsible open={isOpen} onOpenChange={() => togglePhase(task.name)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isOpen ? (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            )}
                            <div>
                              <CardTitle className="text-lg">{task.name}</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">
                                {taskCount} tasks • {task.estimatedDays} estimated days
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            Milestone {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="space-y-3">
                          {task.subtasks && task.subtasks.map((subtask, subtaskIndex) => {
                            const subtaskGlobalIndex = taskIndexMap.get(subtask.id) || 0;
                            return (
                              <div key={subtask.id} className="space-y-2">
                                {/* Main Task */}
                                <div className="border rounded-lg p-4 bg-white">
                                  <div className="flex items-start justify-between mb-2">
                                    <Link href={`/templates/${id}/tasks/${subtaskGlobalIndex}`}>
                                      <h4 className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                                        {subtask.name}
                                      </h4>
                                    </Link>
                                    <div className="flex items-center gap-2 ml-4">
                                      <Badge className={getPriorityColor(subtask.priority)}>
                                        {getPriorityIcon(subtask.priority)}
                                        <span className="ml-1 capitalize">{subtask.priority}</span>
                                      </Badge>
                                      {subtask.estimatedDays && (
                                        <div className="flex items-center gap-1 text-sm text-gray-500">
                                          <Clock className="w-3 h-3" />
                                          {subtask.estimatedDays} day{subtask.estimatedDays !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {subtask.description && (
                                    <p className="text-sm text-gray-600 mt-2">{subtask.description}</p>
                                  )}
                                </div>
                                
                                {/* Sub-subtasks */}
                                {subtask.subtasks && subtask.subtasks.length > 0 && (
                                  <div className="ml-6 space-y-2">
                                    {subtask.subtasks.map((subsubtask, subsubtaskIndex) => {
                                      const subsubtaskGlobalIndex = taskIndexMap.get(subsubtask.id) || 0;
                                      return (
                                        <div key={subsubtask.id} className="border rounded-lg p-3 bg-gray-50 border-l-4 border-l-blue-200">
                                          <div className="flex items-start justify-between">
                                            <Link href={`/templates/${id}/tasks/${subsubtaskGlobalIndex}`}>
                                              <h5 className="text-sm font-medium text-gray-800 hover:text-blue-600 cursor-pointer transition-colors">
                                                {subsubtask.name}
                                              </h5>
                                            </Link>
                                            <div className="flex items-center gap-2 ml-4">
                                              <Badge variant="outline" className="text-xs">
                                                {subsubtask.priority}
                                              </Badge>
                                              {subsubtask.estimatedDays && (
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                  <Clock className="w-3 h-3" />
                                                  {subsubtask.estimatedDays} day{subsubtask.estimatedDays !== 1 ? 's' : ''}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          {subsubtask.description && (
                                            <p className="text-xs text-gray-600 mt-1">{subsubtask.description}</p>
                                          )}
                                          
                                          {/* Sub-sub-subtasks */}
                                          {subsubtask.subtasks && subsubtask.subtasks.length > 0 && (
                                            <div className="ml-4 mt-2 space-y-1">
                                              {subsubtask.subtasks.map((subsubsubtask) => {
                                                const subsubsubtaskGlobalIndex = taskIndexMap.get(subsubsubtask.id) || 0;
                                                return (
                                                  <div key={subsubsubtask.id} className="border rounded-lg p-2 bg-white border-l-4 border-l-green-200">
                                                    <Link href={`/templates/${id}/tasks/${subsubsubtaskGlobalIndex}`}>
                                                      <h6 className="text-xs font-medium text-gray-700 hover:text-blue-600 cursor-pointer transition-colors">
                                                        {subsubsubtask.name}
                                                      </h6>
                                                    </Link>
                                                    {subsubsubtask.description && (
                                                      <p className="text-xs text-gray-500 mt-1">{subsubsubtask.description}</p>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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