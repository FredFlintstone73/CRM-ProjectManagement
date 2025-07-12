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
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDays: number;
}

// Group tasks by workflow phase based on the actual CSV sections
const groupTasksByPhase = (tasks: TaskTemplate[]) => {
  const phases = {
    'Confirming & Scheduling Meeting Dates & Times': [] as TaskTemplate[],
    'Preparing for & Gathering Information for Meetings': [] as TaskTemplate[],
    'Preparing for DRPM': [] as TaskTemplate[],
    'Team Coordination & Deliverables': [] as TaskTemplate[],
    'Client Service Rep Tasks': [] as TaskTemplate[],
    'Progress Meeting': [] as TaskTemplate[],
    'Post-Meeting Tasks': [] as TaskTemplate[]
  };

  tasks.forEach(task => {
    const taskName = task.name.toLowerCase();
    
    if (taskName.includes('confirm meeting') || taskName.includes('enter dates') || taskName.includes('submit proposed dates') || taskName.includes('update new meeting') || taskName.includes('expectation email # 1')) {
      phases['Confirming & Scheduling Meeting Dates & Times'].push(task);
    } else if (taskName.includes('items still needed') || taskName.includes('consolidate items') || taskName.includes('consolidate highest priority') || taskName.includes('request account values') || taskName.includes('request actions taken') || taskName.includes('download account values')) {
      phases['Preparing for & Gathering Information for Meetings'].push(task);
    } else if (taskName.includes('circle chart') || taskName.includes('expectation letter # 2') || taskName.includes('confirm date of drpm') || taskName.includes('generate reports') || taskName.includes('submit critical reports') || taskName.includes('trust advisor review') || taskName.includes('preliminary packet') || taskName.includes('expectation letter # 3') || taskName.includes('nominations and deliverable')) {
      phases['Preparing for DRPM'].push(task);
    } else if (taskName.includes('estate attorney') || taskName.includes('financial planner') || taskName.includes('insurance planner') || taskName.includes('money manager') || taskName.includes('tax planner') || taskName.includes('sme')) {
      phases['Team Coordination & Deliverables'].push(task);
    } else if (taskName.includes('csr0') || taskName.includes('client service rep') || taskName.includes('administrative manager') || taskName.includes('am01') || taskName.includes('meeting packets')) {
      phases['Client Service Rep Tasks'].push(task);
    } else if (taskName.includes('csr meeting') || taskName.includes('progress meeting') || taskName.includes('meeting execution')) {
      phases['Progress Meeting'].push(task);
    } else if (taskName.includes('post') || taskName.includes('archive') || taskName.includes('notes') || taskName.includes('follow up') || taskName.includes('after meeting')) {
      phases['Post-Meeting Tasks'].push(task);
    } else {
      // Default to team coordination for uncategorized tasks
      phases['Team Coordination & Deliverables'].push(task);
    }
  });

  // Filter out empty phases
  return Object.entries(phases).filter(([_, tasks]) => tasks.length > 0);
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
    tasks = typeof template.tasks === 'string' 
      ? JSON.parse(template.tasks) 
      : template.tasks || [];
  } catch (error) {
    console.error('Error parsing tasks:', error);
    tasks = [];
  }

  const groupedTasks = groupTasksByPhase(tasks);
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
                      <p className="font-medium">{groupedTasks.length}</p>
                      <p className="text-sm text-gray-500">Workflow Phases</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Phases */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Workflow Phases</h2>
            
            {groupedTasks.map(([phaseName, phaseTasks], index) => {
              const isOpen = openPhases.includes(phaseName);
              const phaseEstimatedDays = phaseTasks.reduce((sum, task) => sum + (task.estimatedDays || 0), 0);
              
              return (
                <Card key={phaseName} className="overflow-hidden">
                  <Collapsible open={isOpen} onOpenChange={() => togglePhase(phaseName)}>
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
                              <CardTitle className="text-lg">{phaseName}</CardTitle>
                              <p className="text-sm text-gray-500 mt-1">
                                {phaseTasks.length} tasks • {phaseEstimatedDays} estimated days
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            Phase {index + 1}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Separator className="mb-4" />
                        <div className="space-y-3">
                          {phaseTasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="border rounded-lg p-4 bg-white">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{task.name}</h4>
                                <div className="flex items-center gap-2 ml-4">
                                  <Badge className={getPriorityColor(task.priority)}>
                                    {getPriorityIcon(task.priority)}
                                    <span className="ml-1 capitalize">{task.priority}</span>
                                  </Badge>
                                  {task.estimatedDays && (
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <Clock className="w-3 h-3" />
                                      {task.estimatedDays} day{task.estimatedDays !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}
                            </div>
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