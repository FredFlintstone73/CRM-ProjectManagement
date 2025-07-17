import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Edit2, 
  Trash2, 
  MessageSquare,
  Paperclip,
  Calendar,
  User,
  CheckCircle,
  Circle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { Task, Milestone, Contact } from '@shared/schema';

interface HierarchicalTaskManagerProps {
  projectId: number;
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
  milestoneId: number | null;
  parentTaskId: number | null;
  level: number;
}

export function HierarchicalTaskManager({ projectId }: HierarchicalTaskManagerProps) {
  const queryClient = useQueryClient();
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
    milestoneId: null,
    parentTaskId: null,
    level: 0
  });
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch tasks hierarchy - fallback to regular tasks endpoint if hierarchy endpoint doesn't exist
  const { data: tasks = [], isLoading: isLoadingTasks, error: tasksError } = useQuery<Task[]>({
    queryKey: ['/api/projects', projectId, 'tasks'],
    queryFn: async () => {
      try {
        // Try the hierarchy endpoint first
        return await apiRequest(`/api/projects/${projectId}/task-hierarchy`);
      } catch (error) {
        // Fallback to regular tasks endpoint
        return await apiRequest(`/api/projects/${projectId}/tasks`);
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch milestones
  const { data: milestones = [], error: milestonesError } = useQuery<Milestone[]>({
    queryKey: ['/api/milestones'],
    queryFn: () => apiRequest('/api/milestones', { params: { projectId } }),
    retry: 1,
    retryDelay: 1000,
  });

  // Fetch team members
  const { data: contacts = [], error: contactsError } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    queryFn: () => apiRequest('/api/contacts'),
    retry: 1,
    retryDelay: 1000,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (taskData: TaskFormData) => 
      apiRequest('/api/tasks', {
        method: 'POST',
        body: { ...taskData, projectId }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'task-hierarchy'] });
      setIsTaskDialogOpen(false);
      resetForm();
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskFormData> }) =>
      apiRequest(`/api/tasks/${id}`, {
        method: 'PUT',
        body: data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'task-hierarchy'] });
      setIsTaskDialogOpen(false);
      resetForm();
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: number) => 
      apiRequest(`/api/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'task-hierarchy'] });
    },
  });

  // Build hierarchical structure
  const buildHierarchy = (tasks: Task[]): TaskNode[] => {
    const taskMap = new Map<number, TaskNode>();
    const rootTasks: TaskNode[] = [];

    // Create nodes for all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [], expanded: expandedTasks.has(task.id) });
    });

    // Build hierarchy
    tasks.forEach(task => {
      const node = taskMap.get(task.id)!;
      if (task.parentTaskId) {
        const parent = taskMap.get(task.parentTaskId);
        if (parent) {
          parent.children!.push(node);
        }
      } else {
        rootTasks.push(node);
      }
    });

    return rootTasks;
  };

  const hierarchicalTasks = buildHierarchy(tasks);

  const toggleExpanded = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const resetForm = () => {
    setTaskFormData({
      title: '',
      description: '',
      dueDate: '',
      assignedTo: '',
      milestoneId: null,
      parentTaskId: null,
      level: 0
    });
    setSelectedTask(null);
    setIsEditMode(false);
  };

  const openTaskDialog = (parentTask?: Task) => {
    resetForm();
    if (parentTask) {
      setTaskFormData(prev => ({
        ...prev,
        parentTaskId: parentTask.id,
        level: parentTask.level + 1,
        milestoneId: parentTask.milestoneId
      }));
    }
    setIsTaskDialogOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setSelectedTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedTo?.toString() || '',
      milestoneId: task.milestoneId,
      parentTaskId: task.parentTaskId,
      level: task.level
    });
    setIsEditMode(true);
    setIsTaskDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && selectedTask) {
      updateTaskMutation.mutate({ id: selectedTask.id, data: taskFormData });
    } else {
      createTaskMutation.mutate(taskFormData);
    }
  };

  const handleStatusToggle = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { status: newStatus, completedAt: newStatus === 'completed' ? new Date() : null }
    });
  };

  const getIndentLevel = (level: number) => ({
    paddingLeft: `${level * 20}px`,
  });

  const getLevelColor = (level: number) => {
    const colors = ['bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100'];
    return colors[level % colors.length];
  };

  const renderTaskNode = (task: TaskNode, level: number = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const assignedContact = contacts.find(c => c.id === task.assignedTo);
    const milestone = milestones.find(m => m.id === task.milestoneId);

    return (
      <div key={task.id} className="mb-2">
        <div 
          className={`border rounded-lg p-3 ${getLevelColor(level)} hover:shadow-md transition-shadow`}
          style={getIndentLevel(level)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(task.id)}
                  className="p-1 h-6 w-6"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusToggle(task)}
                className="p-1 h-6 w-6"
              >
                {task.status === 'completed' ? (
                  <CheckCircle size={16} className="text-green-600" />
                ) : (
                  <Circle size={16} className="text-gray-400" />
                )}
              </Button>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                    {task.title}
                  </h4>
                  <Badge variant="outline" className="text-xs">
                    Level {task.level}
                  </Badge>
                </div>
                
                {task.description && (
                  <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {task.dueDate && (
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  
                  {assignedContact && (
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      {assignedContact.firstName} {assignedContact.familyName}
                    </div>
                  )}
                  
                  {milestone && (
                    <Badge variant="secondary" className="text-xs">
                      {milestone.title}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openTaskDialog(task)}
                className="p-1 h-6 w-6"
              >
                <Plus size={12} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditDialog(task)}
                className="p-1 h-6 w-6"
              >
                <Edit2 size={12} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteTaskMutation.mutate(task.id)}
                className="p-1 h-6 w-6 text-red-500 hover:text-red-700"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="ml-4 mt-2">
            {task.children!.map(child => renderTaskNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingTasks) {
    return <div className="p-6">Loading tasks...</div>;
  }

  if (tasksError || milestonesError || contactsError) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <p className="text-red-600">Error loading task data. Please try refreshing the page.</p>
          <p className="text-sm text-gray-500 mt-2">
            {tasksError?.message || milestonesError?.message || contactsError?.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Hierarchical Task Management</h2>
        <Button onClick={() => openTaskDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Root Task
        </Button>
      </div>

      <div className="space-y-4">
        {hierarchicalTasks.map(task => renderTaskNode(task))}
      </div>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Edit Task' : 'Create New Task'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input
                  id="title"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={taskFormData.dueDate}
                  onChange={(e) => setTaskFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Select
                  value={taskFormData.assignedTo}
                  onValueChange={(value) => setTaskFormData(prev => ({ ...prev, assignedTo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {contacts.filter(c => c.contactType === 'team_member').map(contact => (
                      <SelectItem key={contact.id} value={contact.id.toString()}>
                        {contact.firstName} {contact.familyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="milestoneId">Milestone</Label>
                <Select
                  value={taskFormData.milestoneId?.toString() || ''}
                  onValueChange={(value) => setTaskFormData(prev => ({ ...prev, milestoneId: value ? parseInt(value) : null }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select milestone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No milestone</SelectItem>
                    {milestones.map(milestone => (
                      <SelectItem key={milestone.id} value={milestone.id.toString()}>
                        {milestone.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTaskMutation.isPending || updateTaskMutation.isPending}>
                {isEditMode ? 'Update Task' : 'Create Task'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}