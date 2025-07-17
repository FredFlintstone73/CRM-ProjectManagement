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
  priority: number; // 1-50 priority level
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

const getPriorityColor = (priority: number) => {
  if (priority >= 40) return 'bg-red-100 text-red-800 border-red-200'; // High priority (40-50)
  if (priority >= 30) return 'bg-orange-100 text-orange-800 border-orange-200'; // Medium-high priority (30-39)
  if (priority >= 20) return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Medium priority (20-29)
  if (priority >= 10) return 'bg-blue-100 text-blue-800 border-blue-200'; // Low-medium priority (10-19)
  return 'bg-gray-100 text-gray-800 border-gray-200'; // Low priority (1-9)
};

const getPriorityIcon = (priority: number) => {
  if (priority >= 40) return <AlertCircle className="w-4 h-4" />; // High priority
  if (priority >= 30) return <CheckCircle2 className="w-4 h-4" />; // Medium-high priority
  if (priority >= 20) return <Circle className="w-4 h-4" />; // Medium priority
  if (priority >= 10) return <Circle className="w-4 h-4" />; // Low-medium priority
  return <Circle className="w-4 h-4" />; // Low priority
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
          <div className="flex items-center gap-2 ml-4">
            <Badge className={getPriorityColor(task.priority)}>
              {getPriorityIcon(task.priority)}
              <span className="ml-1">Priority {task.priority}</span>
            </Badge>
          </div>
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
    priority: typeof task.priority === 'number' ? task.priority : 25, // Default to middle priority
    estimatedDays: 1, // Default value since we don't store this in DB
    daysFromMeeting: 0, // Default value since we don't store this in DB
    parentTaskId: task.parentTaskId,
    assignedTo: null, // Don't show assigned team members for templates
    comments: ''
  }));

  // Group tasks by milestone
  const tasksByMilestone = new Map<string, TaskTemplate[]>();
  allTasks.forEach((task: any) => {
    const milestoneTitle = task.milestone?.title || 'Uncategorized';
    if (!tasksByMilestone.has(milestoneTitle)) {
      tasksByMilestone.set(milestoneTitle, []);
    }
    tasksByMilestone.get(milestoneTitle)!.push({
      id: task.id,
      name: task.title,
      description: task.description || '',
      priority: typeof task.priority === 'number' ? task.priority : 25, // Default to middle priority
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
            
            {Array.from(tasksByMilestone.entries()).map(([milestoneTitle, milestoneTasks], milestoneIndex) => {
              const isOpen = openPhases.includes(milestoneTitle);
              const hierarchicalTasks = buildTaskHierarchy(milestoneTasks);
              const taskCount = milestoneTasks.length;
              
              return (
                <Card key={milestoneTitle} className="overflow-hidden">
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
                            <div>
                              <CardTitle className="text-lg">{milestoneTitle}</CardTitle>
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