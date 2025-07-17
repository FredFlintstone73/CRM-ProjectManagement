import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Edit3, Trash2, CheckCircle, Circle, CalendarDays, ChevronRight, ChevronDown, User } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Task, Contact } from "@shared/schema";

interface SectionTaskManagerProps {
  projectId: number;
}

interface TaskSection {
  id: string;
  title: string;
  tasks: TaskNode[];
}

interface TaskNode extends Task {
  children?: TaskNode[];
  expanded?: boolean;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  assignedTo: string;
  parentTaskId: number | null;
  sectionId: string;
}

interface SectionFormData {
  title: string;
}

interface EditingSectionState {
  id: string;
  title: string;
}

export function SectionTaskManager({ projectId }: SectionTaskManagerProps) {
  const { toast } = useToast();
  
  // Form states
  const [selectedTask, setSelectedTask] = useState<TaskNode | null>(null);
  const [selectedSection, setSelectedSection] = useState<TaskSection | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormData>({
    title: "",
    description: "",
    dueDate: "",
    assignedTo: "",
    parentTaskId: null,
    sectionId: "",
  });
  const [sectionForm, setSectionForm] = useState<SectionFormData>({
    title: "",
  });
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<number | null>(null);
  const [editingSection, setEditingSection] = useState<EditingSectionState | null>(null);

  // Mock sections for now - will be replaced with real data
  const [sections, setSections] = useState<TaskSection[]>([
    { id: "section-1", title: "Planning Phase", tasks: [] },
    { id: "section-2", title: "Execution Phase", tasks: [] },
  ]);

  // Fetch tasks and organize by sections
  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['/api/projects', projectId, 'tasks'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/projects/${projectId}/tasks`);
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        return [];
      }
    },
    enabled: !!projectId,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch team members
  const { data: contacts = [], error: contactsError } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/contacts');
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
        return [];
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const teamMembers = contacts.filter(contact => 
    contact && contact.contactType === 'team_member' && contact.status === 'active'
  );

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (taskData: TaskFormData) => 
      apiRequest('POST', '/api/tasks', {
        ...taskData,
        projectId,
        level: taskData.parentTaskId ? 
          (tasks.find(t => t.id === taskData.parentTaskId)?.level || 0) + 1 : 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      setIsTaskDialogOpen(false);
      resetTaskForm();
      toast({ title: "Task created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create task", variant: "destructive" });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: (taskData: TaskFormData & { id: number }) => 
      apiRequest('PATCH', `/api/tasks/${taskData.id}`, taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      setIsTaskDialogOpen(false);
      resetTaskForm();
      toast({ title: "Task updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update task", variant: "destructive" });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => 
      apiRequest('DELETE', `/api/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      setDeleteTaskId(null);
      toast({ title: "Task deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete task", variant: "destructive" });
    },
  });

  // Toggle task completion
  const toggleTaskCompletion = useMutation({
    mutationFn: (task: Task) => 
      apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        completed: !task.completed,
        completedAt: !task.completed ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
    },
  });

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      dueDate: "",
      assignedTo: "",
      parentTaskId: null,
      sectionId: "",
    });
    setSelectedTask(null);
    setIsEditMode(false);
  };

  const openTaskDialog = (sectionId: string, parentTask?: Task) => {
    resetTaskForm();
    setTaskForm(prev => ({
      ...prev,
      sectionId,
      parentTaskId: parentTask?.id || null,
    }));
    setIsTaskDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task as TaskNode);
    
    // Extract section from description and clean it
    const cleanDescription = task.description ? 
      task.description.replace(/^\[.*?\]\s*/, '') : '';
    
    // Find section ID from description
    const sectionMatch = task.description?.match(/^\[(.*?)\]/);
    const sectionTitle = sectionMatch ? sectionMatch[1] : '';
    const sectionId = sections.find(s => s.title === sectionTitle)?.id || "section-1";
    
    setTaskForm({
      title: task.title,
      description: cleanDescription,
      dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : "",
      assignedTo: task.assignedTo || "",
      parentTaskId: task.parentTaskId,
      sectionId: sectionId,
    });
    setIsEditMode(true);
    setIsTaskDialogOpen(true);
  };

  const openSectionDialog = () => {
    setSectionForm({ title: "" });
    setSelectedSection(null);
    setEditingSection(null);
    setIsSectionDialogOpen(true);
  };

  const handleSubmitTask = () => {
    // Find the section title to store in description
    const currentSection = sections.find(s => s.id === taskForm.sectionId);
    const sectionPrefix = currentSection ? `[${currentSection.title}] ` : '';
    
    // Prepare task data with proper type conversions
    const taskData = {
      ...taskForm,
      description: sectionPrefix + (taskForm.description || ''), // Embed section in description
      parentTaskId: taskForm.parentTaskId || null,
      assignedTo: taskForm.assignedTo || null, // Keep as string to match schema
      projectId: projectId,
      milestoneId: null, // We'll use null for now since we're using sections
      priority: 'medium', // Default priority
      status: 'todo', // Default status (matching schema enum)
    };

    if (isEditMode && selectedTask) {
      updateTaskMutation.mutate({ ...taskData, id: selectedTask.id });
    } else {
      createTaskMutation.mutate(taskData);
    }
  };

  const handleSubmitSection = () => {
    if (sectionForm.title.trim()) {
      if (editingSection) {
        // Update existing section
        setSections(prev => 
          prev.map(section => 
            section.id === editingSection.id 
              ? { ...section, title: sectionForm.title.trim() }
              : section
          )
        );
        setEditingSection(null);
        toast({ title: "Section updated successfully" });
      } else {
        // Create new section
        const newSection: TaskSection = {
          id: `section-${Date.now()}`,
          title: sectionForm.title.trim(),
          tasks: [],
        };
        setSections(prev => [...prev, newSection]);
        toast({ title: "Section created successfully" });
      }
      setIsSectionDialogOpen(false);
      setSectionForm({ title: "" });
    }
  };

  const openEditSectionDialog = (section: TaskSection) => {
    setEditingSection({ id: section.id, title: section.title });
    setSectionForm({ title: section.title });
    setIsSectionDialogOpen(true);
  };

  const deleteSection = (sectionId: string) => {
    setSections(prev => prev.filter(section => section.id !== sectionId));
    toast({ title: "Section deleted successfully" });
  };

  // Build task hierarchy for a section
  const buildTaskHierarchy = (sectionId: string): TaskNode[] => {
    if (!tasks || !Array.isArray(tasks)) return [];
    
    try {
      const currentSection = sections.find(s => s.id === sectionId);
      const sectionTitle = currentSection?.title || '';
      
      const sectionTasks = tasks.filter(task => 
        task && (
          // Check if task description starts with section prefix
          (sectionTitle && task.description?.startsWith(`[${sectionTitle}]`)) &&
          !task.parentTaskId
        )
      );
      
      const buildChildren = (parentId: number): TaskNode[] => {
        if (!parentId || !tasks) return [];
        
        const children = tasks.filter(task => 
          task && task.parentTaskId === parentId
        );
        
        return children.map(child => ({
          ...child,
          children: buildChildren(child.id),
          expanded: true,
        }));
      };

      return sectionTasks.map(task => ({
        ...task,
        children: buildChildren(task.id),
        expanded: true,
      }));
    } catch (error) {
      console.error('Error building task hierarchy:', error);
      return [];
    }
  };

  const renderTaskNode = (task: TaskNode, level: number = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const assignedUser = teamMembers.find(member => member.id.toString() === task.assignedTo);
    
    // Clean up description by removing section prefix
    const cleanDescription = task.description ? 
      task.description.replace(/^\[.*?\]\s*/, '') : '';
    
    return (
      <div key={task.id} className="space-y-2">
        <div 
          className={`flex items-center gap-2 p-3 rounded-lg border ${
            task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => {
                // Toggle expansion logic would go here
              }}
            >
              {task.expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => toggleTaskCompletion.mutate(task)}
          >
            {task.completed ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 text-gray-400" />
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {task.title}
              </span>
              {task.dueDate && (
                <Badge variant="outline" className="text-xs">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  {format(new Date(task.dueDate), 'MMM d')}
                </Badge>
              )}
              {assignedUser && (
                <Badge variant="secondary" className="text-xs">
                  <User className="h-3 w-3 mr-1" />
                  {assignedUser.firstName} {assignedUser.lastName}
                </Badge>
              )}
            </div>
            {cleanDescription && (
              <p className="text-sm text-gray-600 mt-1">{cleanDescription}</p>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openTaskDialog(task.milestoneId?.toString() || "section-1", task)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openEditDialog(task)}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600"
              onClick={() => setDeleteTaskId(task.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {hasChildren && task.expanded && task.children && (
          <div className="space-y-2">
            {task.children.map(child => renderTaskNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingTasks) {
    return <div className="p-6">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Tasks</h2>
        <Button onClick={openSectionDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Add Section
        </Button>
      </div>

      <div className="max-h-[600px] overflow-y-auto space-y-6 pr-2">
        {sections.map(section => {
          const sectionTasks = buildTaskHierarchy(section.id);
          
          return (
            <Card key={section.id}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => openEditSectionDialog(section)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => deleteSection(section.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openTaskDialog(section.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {sectionTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No tasks in this section yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sectionTasks.map(task => renderTaskNode(task))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Task' : 'Add New Task'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Due Date</label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Assigned To</label>
              <Select
                value={taskForm.assignedTo}
                onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.length > 0 ? (
                    teamMembers.map(member => (
                      <SelectItem key={member.id} value={member.id.toString()}>
                        {member.firstName} {member.lastName || ''}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No team members available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitTask}
                disabled={!taskForm.title.trim() || createTaskMutation.isPending || updateTaskMutation.isPending}
                className="flex-1"
              >
                {isEditMode ? 'Update Task' : 'Create Task'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsTaskDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Add New Section"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Section Title</label>
              <Input
                value={sectionForm.title}
                onChange={(e) => setSectionForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter section title"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitSection}
                disabled={!sectionForm.title.trim()}
                className="flex-1"
              >
                {editingSection ? "Update Section" : "Create Section"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsSectionDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteTaskId !== null} onOpenChange={() => setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTaskId && deleteTaskMutation.mutate(deleteTaskId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}