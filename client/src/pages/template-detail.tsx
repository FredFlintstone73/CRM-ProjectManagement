import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Calendar,
  Clock,
  GripVertical,
} from "lucide-react";
import { Link } from "wouter";
import type { ProjectTemplate } from "@shared/schema";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const taskMap = new Map<number, TaskTemplate>();
  
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, subtasks: [] });
  });
  
  const rootTasks: TaskTemplate[] = [];
  
  tasks.forEach(task => {
    const currentTask = taskMap.get(task.id)!;
    
    if (task.parentTaskId === null || task.parentTaskId === undefined) {
      rootTasks.push(currentTask);
    } else {
      const parentTask = taskMap.get(task.parentTaskId);
      if (parentTask) {
        if (!parentTask.subtasks) parentTask.subtasks = [];
        parentTask.subtasks.push(currentTask);
      } else {
        rootTasks.push(currentTask);
      }
    }
  });
  
  return rootTasks;
};

// TaskDisplay component for recursive task rendering
const TaskDisplay = ({ 
  task, 
  templateId, 
  level = 0, 
  milestone, 
  editingTask, 
  setEditingTask, 
  updateTaskMutation, 
  deleteTaskMutation, 
  createTaskMutation,
  expandedTasks,
  toggleTaskExpansion,
  teamMembers = [],
  allTeamMembers = [],
  currentUser,
  editingTaskTitle,
  setEditingTaskTitle,
  editingTaskDescription,
  setEditingTaskDescription,
  editingTaskDueDate,
  setEditingTaskDueDate,
  editingTaskAssignedTo,
  setEditingTaskAssignedTo,
  editingTaskDaysFromMeeting,
  setEditingTaskDaysFromMeeting,
  startEditingTask,
  saveEditingTask,
  cancelEditingTask
}: { 
  task: TaskTemplate, 
  templateId: string | undefined, 
  level?: number,
  milestone: any,
  editingTask: number | null,
  setEditingTask: (id: number | null) => void,
  updateTaskMutation: any,
  deleteTaskMutation: any,
  createTaskMutation: any,
  expandedTasks: Set<number>,
  toggleTaskExpansion: (id: number) => void,
  teamMembers?: any[],
  allTeamMembers?: any[],
  currentUser?: any,
  editingTaskTitle: string,
  setEditingTaskTitle: (title: string) => void,
  editingTaskDescription: string,
  setEditingTaskDescription: (description: string) => void,
  editingTaskDueDate: string,
  setEditingTaskDueDate: (date: string) => void,
  editingTaskAssignedTo: string,
  setEditingTaskAssignedTo: (assignedTo: string) => void,
  editingTaskDaysFromMeeting: string,
  setEditingTaskDaysFromMeeting: (days: string) => void,
  startEditingTask: (task: any) => void,
  saveEditingTask: () => void,
  cancelEditingTask: () => void
}) => {
  const indentClass = level === 0 ? '' : level === 1 ? 'ml-6' : level === 2 ? 'ml-12' : 'ml-16';
  const bgClass = level === 0 ? 'bg-white' : level === 1 ? 'bg-gray-50 border-l-4 border-l-blue-200' : level === 2 ? 'bg-gray-25 border-l-4 border-l-green-200' : 'bg-white border-l-4 border-l-purple-200';
  
  const handleAddSubtask = () => {
    const title = prompt('Enter subtask title:');
    if (title) {
      createTaskMutation.mutate({ 
        title, 
        description: '', 
        milestoneId: milestone.id, 
        parentTaskId: task.id 
      });
    }
  };
  
  const handleDeleteTask = () => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(task.id);
    }
  };
  
  const isEditing = editingTask === task.id;
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isExpanded = expandedTasks.has(task.id);
  
  return (
    <div className={`space-y-2 ${indentClass}`}>
      <div className={`border rounded-lg p-4 ${bgClass} group`}>
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                value={editingTaskTitle}
                onChange={(e) => setEditingTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Description</label>
              <Textarea
                value={editingTaskDescription}
                onChange={(e) => setEditingTaskDescription(e.target.value)}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Days from Meeting</label>
                <Select value={editingTaskDaysFromMeeting} onValueChange={setEditingTaskDaysFromMeeting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Array.from({ length: 85 }, (_, i) => -80 + i).map((days) => (
                      <SelectItem key={days} value={days.toString()}>
                        {days > 0 ? `+${days}` : days} days {days > 0 ? 'after' : 'before'} meeting
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Due Date</label>
                <Input
                  type="date"
                  value={editingTaskDueDate}
                  onChange={(e) => setEditingTaskDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Assigned To</label>
                <Select value={editingTaskAssignedTo} onValueChange={setEditingTaskAssignedTo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    <SelectItem value="me">Assign to Me</SelectItem>
                    {teamMembers?.filter(member => {
                      const currentUserEmail = currentUser?.email;
                      return !(currentUserEmail && (member.personalEmail === currentUserEmail || member.workEmail === currentUserEmail));
                    }).map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.firstName} {member.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveEditingTask}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditingTask}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {hasSubtasks && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTaskExpansion(task.id)}
                    className="p-1 h-6 w-6"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>
                )}
                <h4 className="font-medium cursor-pointer" onClick={() => startEditingTask(task)}>
                  {task.name || task.title}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                </Badge>
              </div>
              {(task.description || task.assignedTo) && (
                <div className="text-sm text-gray-600 mt-1 space-y-1">
                  {task.description && <p>{task.description}</p>}
                  {task.assignedTo && (
                    <p className="text-blue-600">
                      Assigned to: {allTeamMembers?.find(m => m.id === task.assignedTo)?.firstName} {allTeamMembers?.find(m => m.id === task.assignedTo)?.lastName}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="sm" variant="ghost" onClick={() => startEditingTask(task)}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleAddSubtask}>
                <Plus className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeleteTask} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Recursively render subtasks */}
      {hasSubtasks && isExpanded && (
        <div className="space-y-2">
          {task.subtasks.map((subtask) => (
            <TaskDisplay 
              key={subtask.id} 
              task={subtask} 
              templateId={templateId}
              level={level + 1}
              milestone={milestone}
              editingTask={editingTask}
              setEditingTask={setEditingTask}
              updateTaskMutation={updateTaskMutation}
              deleteTaskMutation={deleteTaskMutation}
              createTaskMutation={createTaskMutation}
              expandedTasks={expandedTasks}
              toggleTaskExpansion={toggleTaskExpansion}
              teamMembers={teamMembers}
              allTeamMembers={allTeamMembers}
              currentUser={currentUser}
              editingTaskTitle={editingTaskTitle}
              setEditingTaskTitle={setEditingTaskTitle}
              editingTaskDescription={editingTaskDescription}
              setEditingTaskDescription={setEditingTaskDescription}
              editingTaskDueDate={editingTaskDueDate}
              setEditingTaskDueDate={setEditingTaskDueDate}
              editingTaskAssignedTo={editingTaskAssignedTo}
              setEditingTaskAssignedTo={setEditingTaskAssignedTo}
              editingTaskDaysFromMeeting={editingTaskDaysFromMeeting}
              setEditingTaskDaysFromMeeting={setEditingTaskDaysFromMeeting}
              startEditingTask={startEditingTask}
              saveEditingTask={saveEditingTask}
              cancelEditingTask={cancelEditingTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Sortable section component
const SortableSection = ({ 
  milestone, 
  milestoneIndex, 
  milestoneTasks, 
  hierarchicalTasks, 
  openPhases, 
  togglePhase, 
  editingMilestone, 
  editingTitle, 
  setEditingTitle, 
  startEditing, 
  saveEditing, 
  cancelEditing, 
  handleAddTask, 
  handleDeleteSection, 
  editingTask, 
  setEditingTask, 
  editingTaskTitle,
  setEditingTaskTitle,
  editingTaskDescription,
  setEditingTaskDescription,
  editingTaskDueDate,
  setEditingTaskDueDate,
  editingTaskAssignedTo,
  setEditingTaskAssignedTo,
  editingTaskDaysFromMeeting,
  setEditingTaskDaysFromMeeting,
  teamMembers,
  allTeamMembers,
  currentUser,
  startEditingTask,
  saveEditingTask,
  cancelEditingTask,
  updateTaskMutation, 
  deleteTaskMutation, 
  createTaskMutation, 
  templateId,
  expandedTasks,
  toggleTaskExpansion
}: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: milestone.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOpen = openPhases ? openPhases.includes(milestone?.id) : false;
  const taskCount = milestoneTasks.length;
  const isEditing = editingMilestone === milestone?.id;

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className="overflow-hidden group"
    >
      <Collapsible open={isOpen} onOpenChange={() => togglePhase && togglePhase(milestone?.id)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="hover:bg-gray-50 cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && saveEditing()}
                      onClick={(e) => e.stopPropagation()}
                      className="text-lg font-medium"
                      autoFocus
                    />
                    <Button size="sm" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      saveEditing();
                    }}>
                      <Save className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      cancelEditing();
                    }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{milestone?.title}</CardTitle>
                    {milestone?.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(milestone);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSection(milestone.id, milestone.title);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Section {milestoneIndex + 1}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Separator className="mb-4" />
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleAddTask(milestone.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>
              {hierarchicalTasks.map((task: any) => (
                <TaskDisplay 
                  key={task.id} 
                  task={task} 
                  templateId={templateId}
                  level={0}
                  milestone={milestone}
                  editingTask={editingTask}
                  setEditingTask={setEditingTask}
                  updateTaskMutation={updateTaskMutation}
                  deleteTaskMutation={deleteTaskMutation}
                  createTaskMutation={createTaskMutation}
                  expandedTasks={expandedTasks}
                  toggleTaskExpansion={toggleTaskExpansion}
                  teamMembers={teamMembers}
                  allTeamMembers={allTeamMembers}
                  currentUser={currentUser}
                  editingTaskTitle={editingTaskTitle}
                  setEditingTaskTitle={setEditingTaskTitle}
                  editingTaskDescription={editingTaskDescription}
                  setEditingTaskDescription={setEditingTaskDescription}
                  editingTaskDueDate={editingTaskDueDate}
                  setEditingTaskDueDate={setEditingTaskDueDate}
                  editingTaskAssignedTo={editingTaskAssignedTo}
                  setEditingTaskAssignedTo={setEditingTaskAssignedTo}
                  editingTaskDaysFromMeeting={editingTaskDaysFromMeeting}
                  setEditingTaskDaysFromMeeting={setEditingTaskDaysFromMeeting}
                  startEditingTask={startEditingTask}
                  saveEditingTask={saveEditingTask}
                  cancelEditingTask={cancelEditingTask}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default function TemplateDetail() {
  const { id } = useParams<TemplateDetailParams>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  
  // State variables
  const [openPhases, setOpenPhases] = useState<number[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [editingMilestone, setEditingMilestone] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>("");
  const [editingTask, setEditingTask] = useState<number | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState<string>("");
  const [editingTaskDescription, setEditingTaskDescription] = useState<string>("");
  const [editingTaskDueDate, setEditingTaskDueDate] = useState<string>("");
  const [editingTaskAssignedTo, setEditingTaskAssignedTo] = useState<string>("");
  const [editingTaskDaysFromMeeting, setEditingTaskDaysFromMeeting] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const [templateDescription, setTemplateDescription] = useState<string>("");
  const [meetingType, setMeetingType] = useState<string>("csr");

  // Fetch template data
  const { data: template, isLoading: isTemplateLoading } = useQuery<ProjectTemplate>({
    queryKey: ['/api/project-templates', id],
    enabled: !!id && isAuthenticated,
  });

  // Fetch current user for "Assign to Me" option
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: isAuthenticated,
  });

  // Fetch all team members for assignment matching
  const { data: allTeamMembers = [] } = useQuery({
    queryKey: ['/api/contacts', 'all-team-members', 'v2'],
    queryFn: async () => {
      const response = await fetch('/api/contacts', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const contacts = await response.json();
      return contacts.filter((contact: any) => contact.contactType === 'team_member' && contact.status === 'active');
    },
    enabled: isAuthenticated && !!currentUser,
    staleTime: 0, // Force fresh data
  });

  // Fetch team members for assignment dropdown (excluding current user)
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['/api/contacts', 'team-members', 'v2'],
    queryFn: async () => {
      const currentUserEmail = currentUser?.email;
      if (currentUserEmail) {
        return allTeamMembers.filter((member: any) => 
          member.personalEmail !== currentUserEmail && member.workEmail !== currentUserEmail
        );
      }
      return allTeamMembers;
    },
    enabled: isAuthenticated && !!currentUser && allTeamMembers.length > 0,
    staleTime: 0, // Force fresh data
  });

  // Fetch milestones
  const { data: milestones = [], isLoading: isMilestonesLoading } = useQuery({
    queryKey: ['/api/milestones', 'template', id],
    queryFn: async () => {
      const response = await fetch(`/api/milestones?templateId=${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch milestones for template ${id}`);
      }
      return await response.json();
    },
    enabled: !!id && isAuthenticated,
  });

  // Initialize template data
  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || "");
      setMeetingType(template.meetingType || "csr");
    }
  }, [template]);

  // Initialize open phases when milestones are loaded
  useEffect(() => {
    if (milestones.length > 0 && openPhases.length === 0) {
      setOpenPhases(milestones.map(m => m.id));
    }
  }, [milestones, openPhases.length]);

  // Toggle phase open/close
  const togglePhase = (milestoneId: number) => {
    setOpenPhases(prev => 
      prev.includes(milestoneId)
        ? prev.filter(id => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  const toggleTaskExpansion = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Mutation for reordering milestones
  const reorderMilestonesMutation = useMutation({
    mutationFn: async (milestoneIds: number[]) => {
      console.log('Sending reorder request with IDs:', milestoneIds);
      return await apiRequest('PUT', `/api/milestones/reorder`, { milestoneIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      toast({
        title: "Success",
        description: "Sections reordered successfully",
      });
    },
    onError: (error) => {
      console.error('Error reordering milestones:', error);
      toast({
        title: "Error",
        description: "Failed to reorder sections",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating milestone
  const createMilestoneMutation = useMutation({
    mutationFn: async ({ title }: { title: string }) => {
      return await apiRequest('POST', `/api/milestones`, { title, templateId: parseInt(id!) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
    },
  });

  // Mutation for deleting milestone
  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      return await apiRequest('DELETE', `/api/milestones/${milestoneId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
    },
  });

  // Mutation for updating milestone
  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, title }: { milestoneId: number; title: string }) => {
      return await apiRequest('PUT', `/api/milestones/${milestoneId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      setEditingMilestone(null);
      setEditingTitle("");
    },
  });

  // Mutation for creating task
  const createTaskMutation = useMutation({
    mutationFn: async ({ title, description, milestoneId, parentTaskId }: any) => {
      return await apiRequest('POST', `/api/tasks`, { 
        title, 
        description, 
        milestoneId, 
        parentTaskId,
        templateId: parseInt(id!)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      queryClient.invalidateQueries({ queryKey: ['template-tasks', id] });
    },
  });

  // Mutation for updating task
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, title, description, dueDate, assignedTo }: any) => {
      return await apiRequest('PUT', `/api/tasks/${taskId}`, { title, description, dueDate, assignedTo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      queryClient.invalidateQueries({ queryKey: ['template-tasks', id] });
      setEditingTask(null);
      setEditingTaskTitle("");
      setEditingTaskDescription("");
      setEditingTaskDueDate("");
      setEditingTaskAssignedTo("");
    },
  });

  // Mutation for deleting task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await apiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      queryClient.invalidateQueries({ queryKey: ['template-tasks', id] });
    },
  });

  // Helper functions
  const handleAddSection = () => {
    const title = prompt('Enter section title:');
    if (title) {
      createMilestoneMutation.mutate({ title });
    }
  };

  const handleAddTask = (milestoneId: number, parentTaskId?: number) => {
    const title = prompt('Enter task title:');
    if (title) {
      createTaskMutation.mutate({ 
        title, 
        description: '', 
        milestoneId, 
        parentTaskId: parentTaskId || null 
      });
    }
  };

  const handleDeleteSection = (milestoneId: number, milestoneTitle: string) => {
    if (confirm(`Are you sure you want to delete section "${milestoneTitle}"? This will remove all tasks in this section.`)) {
      deleteMilestoneMutation.mutate(milestoneId);
    }
  };

  const startEditing = (milestone: any) => {
    setEditingMilestone(milestone.id);
    setEditingTitle(milestone.title);
  };

  const saveEditing = () => {
    if (editingMilestone && editingTitle.trim()) {
      updateMilestoneMutation.mutate({ milestoneId: editingMilestone, title: editingTitle });
    }
  };

  const cancelEditing = () => {
    setEditingMilestone(null);
    setEditingTitle("");
  };

  const startEditingTask = (task: any) => {
    setEditingTask(task.id);
    setEditingTaskTitle(task.title || task.name || "");
    setEditingTaskDescription(task.description || "");
    setEditingTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "");
    setEditingTaskDaysFromMeeting(task.daysFromMeeting?.toString() || "0");
    
    // Check if the assigned user is the current user
    let assignedValue = "unassigned";
    if (task.assignedTo) {
      const currentUserEmail = currentUser?.email;
      const assignedUser = allTeamMembers?.find((member: any) => member.id === task.assignedTo);
      if (assignedUser && currentUserEmail && 
          (assignedUser.personalEmail === currentUserEmail || assignedUser.workEmail === currentUserEmail)) {
        assignedValue = "me";
      } else {
        assignedValue = task.assignedTo.toString();
      }
    }
    setEditingTaskAssignedTo(assignedValue);
  };

  const saveEditingTask = () => {
    if (editingTask && editingTaskTitle.trim()) {
      let assignedTo = null;
      if (editingTaskAssignedTo && editingTaskAssignedTo !== "unassigned") {
        if (editingTaskAssignedTo === "me") {
          assignedTo = "me";
        } else {
          assignedTo = parseInt(editingTaskAssignedTo);
        }
      }
      
      updateTaskMutation.mutate({ 
        taskId: editingTask, 
        title: editingTaskTitle.trim(), 
        description: editingTaskDescription || null,
        dueDate: editingTaskDueDate || null,
        assignedTo: assignedTo,
        daysFromMeeting: editingTaskDaysFromMeeting ? parseInt(editingTaskDaysFromMeeting) : 0,
      });
    }
  };

  const cancelEditingTask = () => {
    setEditingTask(null);
    setEditingTaskTitle("");
    setEditingTaskDescription("");
    setEditingTaskDueDate("");
    setEditingTaskAssignedTo("unassigned");
    setEditingTaskDaysFromMeeting("");
  };

  // Save template data
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Template name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('PUT', `/api/project-templates/${id}`, {
        name: templateName,
        description: templateDescription,
        meetingType: meetingType,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/project-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/project-templates', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/milestones', 'template', id] });
      
      toast({
        title: "Success",
        description: "Template saved successfully",
      });
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive",
      });
    }
  };

  // Drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = milestones.findIndex((milestone) => milestone.id === active.id);
      const newIndex = milestones.findIndex((milestone) => milestone.id === over?.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedMilestones = arrayMove(milestones, oldIndex, newIndex);
        const milestoneIds = reorderedMilestones.map(m => {
          const id = parseInt(String(m.id));
          return isNaN(id) ? m.id : id;
        });
        
        console.log('Reordering milestones:', milestoneIds);
        reorderMilestonesMutation.mutate(milestoneIds);
      }
    }
  };

  // Fetch tasks for each milestone
  const taskQueries = useQuery({
    queryKey: ['template-tasks', id, milestones.map(m => m.id)],
    queryFn: async () => {
      if (!milestones || milestones.length === 0) return [];
      
      const taskPromises = milestones.map(async (milestone) => {
        const response = await fetch(`/api/milestones/${milestone.id}/tasks`, {
          credentials: 'include'
        });
        if (!response.ok) {
          console.error(`Failed to fetch tasks for milestone ${milestone.id}`);
          return { milestoneId: milestone.id, tasks: [] };
        }
        const tasks = await response.json();
        return { milestoneId: milestone.id, tasks };
      });
      
      const results = await Promise.all(taskPromises);
      return results;
    },
    enabled: !!id && isAuthenticated && milestones.length > 0,
  });

  // Prepare data for rendering
  const tasksByMilestone = useMemo(() => {
    const map = new Map();
    
    milestones.forEach((milestone) => {
      map.set(milestone.id, { milestone, tasks: [] });
    });

    // Add tasks to their respective milestones
    if (taskQueries.data) {
      taskQueries.data.forEach(({ milestoneId, tasks }) => {
        if (map.has(milestoneId)) {
          map.get(milestoneId).tasks = tasks;
        }
      });
    }

    return map;
  }, [milestones, taskQueries.data]);

  const totalTasks = Array.from(tasksByMilestone.values()).reduce((sum, { tasks }) => sum + tasks.length, 0);
  const totalDays = Array.from(tasksByMilestone.values()).reduce((sum, { tasks }) => 
    sum + tasks.reduce((taskSum: number, task: any) => taskSum + (task.estimatedDays || 0), 0), 0
  );

  if (isLoading || isTemplateLoading || isMilestonesLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center h-64">Please log in to view this template.</div>;
  }

  return (
    <>
      <Header 
        title="Edit Template"
        subtitle={`${totalTasks} tasks • ${totalDays} estimated days`}
        showActions={false}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          <div className="mb-6">
            <Link href="/templates">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Template Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Template Name</label>
                    <Input
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div style={{ width: '640px' }}>
                    <label className="text-sm font-medium mb-1 block">Meeting Type</label>
                    <Select value={meetingType} onValueChange={setMeetingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="frm">Financial Road Map Interview (FRM)</SelectItem>
                        <SelectItem value="im">Implementation Meeting (IM)</SelectItem>
                        <SelectItem value="ipu">Initial Progress Update (IPU)</SelectItem>
                        <SelectItem value="csr">Comprehensive Safety Review (CSR)</SelectItem>
                        <SelectItem value="gpo">Goals Progress Update (GPO)</SelectItem>
                        <SelectItem value="tar">The Annual Review (TAR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Template Description</label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Enter template description"
                    rows={3}
                  />
                </div>
                <div className="flex justify-center">
                  <Button onClick={handleSaveTemplate} className="min-w-24">
                    <Save className="w-4 h-4 mr-2" />
                    Save Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <Button onClick={handleAddSection} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Section
            </Button>
          </div>

          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={milestones.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {Array.from(tasksByMilestone.entries()).map(([milestoneId, { milestone, tasks: milestoneTasks }], milestoneIndex) => {
                  const hierarchicalTasks = buildTaskHierarchy(milestoneTasks);
                  
                  return (
                    <SortableSection
                      key={milestone?.id}
                      milestone={milestone}
                      milestoneIndex={milestoneIndex}
                      milestoneTasks={milestoneTasks}
                      hierarchicalTasks={hierarchicalTasks}
                      openPhases={openPhases}
                      togglePhase={togglePhase}
                      editingMilestone={editingMilestone}
                      editingTitle={editingTitle}
                      setEditingTitle={setEditingTitle}
                      startEditing={startEditing}
                      saveEditing={saveEditing}
                      cancelEditing={cancelEditing}
                      handleAddTask={handleAddTask}
                      handleDeleteSection={handleDeleteSection}
                      editingTask={editingTask}
                      setEditingTask={setEditingTask}
                      editingTaskTitle={editingTaskTitle}
                      setEditingTaskTitle={setEditingTaskTitle}
                      editingTaskDescription={editingTaskDescription}
                      setEditingTaskDescription={setEditingTaskDescription}
                      editingTaskDueDate={editingTaskDueDate}
                      setEditingTaskDueDate={setEditingTaskDueDate}
                      editingTaskAssignedTo={editingTaskAssignedTo}
                      setEditingTaskAssignedTo={setEditingTaskAssignedTo}
                      editingTaskDaysFromMeeting={editingTaskDaysFromMeeting}
                      setEditingTaskDaysFromMeeting={setEditingTaskDaysFromMeeting}
                      teamMembers={teamMembers}
                      allTeamMembers={allTeamMembers}
                      currentUser={currentUser}
                      startEditingTask={startEditingTask}
                      saveEditingTask={saveEditingTask}
                      cancelEditingTask={cancelEditingTask}
                      updateTaskMutation={updateTaskMutation}
                      deleteTaskMutation={deleteTaskMutation}
                      createTaskMutation={createTaskMutation}
                      templateId={id}
                      expandedTasks={expandedTasks}
                      toggleTaskExpansion={toggleTaskExpansion}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      </main>
    </>
  );
}