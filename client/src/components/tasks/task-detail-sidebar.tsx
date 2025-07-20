import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { 
  X, 
  Edit2, 
  Calendar, 
  User, 
  CheckCircle, 
  Circle, 
  MessageSquare,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest } from '@/lib/queryClient';
import { getDueDateBadgeProps } from '@/lib/dueDateUtils';
import { TaskComments } from '@/components/tasks/task-comments';
import type { Task, Contact } from '@shared/schema';

interface TaskDetailSidebarProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  onTaskUpdate?: () => void;
  onTaskClick?: (task: Task) => void;
}

export function TaskDetailSidebar({ task, isOpen, onClose, projectId, onTaskUpdate, onTaskClick }: TaskDetailSidebarProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(task);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: ''
  });

  // Update local selected task when prop changes
  useEffect(() => {
    setSelectedTask(task);
  }, [task]);

  // Fetch contacts for assignment dropdown
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: !!selectedTask,
  });

  // Get all project tasks for navigation
  const { data: projectTasks = [] } = useQuery<Task[]>({
    queryKey: ['/api/projects', projectId, 'tasks'],
    enabled: !!projectId && !!selectedTask,
  });

  // Sync selected task with updated project tasks data
  useEffect(() => {
    if (selectedTask && projectTasks) {
      const updatedTask = projectTasks.find(t => t.id === selectedTask.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updatedTask);
      }
    }
  }, [projectTasks, selectedTask]);

  // Update task completion status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, updates }: { taskId: number; updates: Partial<Task> }) => {
      return apiRequest('PATCH', `/api/tasks/${taskId}`, updates);
    },
    onSuccess: (updatedTask: Task) => {
      // Optimistically update the cache instead of invalidating everything
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
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
      
      // Update the selected task immediately
      if (selectedTask && updatedTask.id === selectedTask.id) {
        setSelectedTask(prev => prev ? { ...prev, ...updatedTask } : prev);
      }
      
      // Also update any milestone/section progress queries
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      
      // Don't call onTaskUpdate to avoid refresh
      // onTaskUpdate?.();
    }
  });

  // Format due date for input
  const formatDateForInput = (date: string | Date | null) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      // Format as YYYY-MM-DD for date input
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return '';
    }
  };

  // Get task navigation info
  const getTaskNavigation = () => {
    try {
      if (!selectedTask || !projectTasks || projectTasks.length === 0) {
        return { prevTask: null, nextTask: null };
      }
      
      // Sort tasks chronologically
      const sortedTasks = [...projectTasks].sort((a, b) => {
        // Sort by daysFromMeeting, then dueDate, then sortOrder, then ID
        if (a.daysFromMeeting !== null && b.daysFromMeeting !== null) {
          return a.daysFromMeeting - b.daysFromMeeting;
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.sortOrder !== b.sortOrder) {
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        }
        return a.id - b.id;
      });
      
      const currentIndex = sortedTasks.findIndex(t => t.id === selectedTask.id);
      const prevTask = currentIndex > 0 ? sortedTasks[currentIndex - 1] : null;
      const nextTask = currentIndex < sortedTasks.length - 1 ? sortedTasks[currentIndex + 1] : null;
      
      return { prevTask, nextTask };
    } catch (error) {
      console.error('Error in getTaskNavigation:', error);
      return { prevTask: null, nextTask: null };
    }
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedTask) return;
    
    const newStatus = selectedTask.status === 'completed' ? 'todo' : 'completed';
    
    // Immediately update the local selected task for instant UI feedback
    const optimisticUpdate = { ...selectedTask, status: newStatus };
    setSelectedTask(optimisticUpdate);
    
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      updates: { status: newStatus }
    }, {
      onSuccess: () => {
        // Don't call onTaskUpdate to avoid page refresh
        // onTaskUpdate?.();
      },
      onError: (error) => {
        // Revert optimistic update on error
        setSelectedTask(selectedTask);
        console.error('Failed to toggle task completion:', error);
      }
    });
  };

  const handleEdit = () => {
    if (!selectedTask) return;
    
    setEditFormData({
      title: selectedTask.title,
      description: selectedTask.description || '',
      dueDate: formatDateForInput(selectedTask.dueDate),
      assignedTo: Array.isArray(selectedTask.assignedTo) ? selectedTask.assignedTo[0]?.toString() || '' : selectedTask.assignedTo?.toString() || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTask) return;
    
    const updates: Partial<Task> = {
      title: editFormData.title,
      description: editFormData.description,
      dueDate: editFormData.dueDate ? `${editFormData.dueDate}T12:00:00.000Z` : null,
      assignedTo: editFormData.assignedTo ? parseInt(editFormData.assignedTo) : null
    };
    
    updateTaskMutation.mutate({
      taskId: selectedTask.id,
      updates
    }, {
      onSuccess: () => {
        setIsEditing(false);
        onTaskUpdate?.();
      },
      onError: (error) => {
        console.error('Failed to update task:', error);
      }
    });
  };

  const getAssignedUser = () => {
    if (!selectedTask?.assignedTo || !contacts.length) return null;
    const assignedIds = Array.isArray(selectedTask.assignedTo) ? selectedTask.assignedTo : [selectedTask.assignedTo];
    return contacts.find(contact => assignedIds.includes(contact.id));
  };

  const { prevTask, nextTask } = getTaskNavigation();

  if (!isOpen || !selectedTask) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-40 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Task Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (prevTask && onTaskClick) {
                onTaskClick(prevTask);
              }
            }}
            disabled={!prevTask}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (nextTask && onTaskClick) {
                onTaskClick(nextTask);
              }
            }}
            disabled={!nextTask}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Task Title and Status */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleToggleComplete}
              className="mt-1 p-0 h-6 w-6 bg-transparent border-none cursor-pointer hover:bg-gray-100 rounded"
              disabled={updateTaskMutation.isPending}
            >
              {selectedTask?.status === 'completed' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="text-lg font-medium"
                />
              ) : (
                <h3 className="text-lg font-medium leading-6">{selectedTask?.title}</h3>
              )}
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Task Info Cards */}
        <div className="space-y-4">
          {/* Due Date */}
          {selectedTask?.dueDate && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium">Due Date</span>
                </div>
                <div className="mt-1">
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editFormData.dueDate}
                      onChange={(e) => setEditFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  ) : (
                    <Badge {...getDueDateBadgeProps(selectedTask.dueDate, selectedTask.status === 'completed')}>
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(selectedTask.dueDate), 'MMM d, yyyy')}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assigned To */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Assigned To</span>
              </div>
              <div className="mt-1">
                {isEditing ? (
                  <Select
                    value={editFormData.assignedTo}
                    onValueChange={(value) => setEditFormData(prev => ({ ...prev, assignedTo: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {contacts
                        .filter(contact => contact.contactType === 'team_member' && contact.status === 'active')
                        .map(contact => (
                          <SelectItem key={contact.id} value={contact.id.toString()}>
                            {contact.firstName} {contact.lastName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div>
                    {getAssignedUser() ? (
                      <Badge variant="secondary">
                        <User className="h-3 w-3 mr-1" />
                        {getAssignedUser()?.firstName} {getAssignedUser()?.lastName}
                      </Badge>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Description</span>
              </div>
              {isEditing ? (
                <Textarea
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description..."
                  rows={3}
                />
              ) : (
                <p className="text-sm text-gray-600">
                  {selectedTask?.description || 'No description provided.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex gap-2">
            <Button onClick={handleSaveEdit} size="sm">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
              Cancel
            </Button>
          </div>
        )}

        <Separator />

        {/* Comments Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Comments</span>
          </div>
          <TaskComments taskId={selectedTask?.id || 0} taskTitle={selectedTask?.title || ''} />
        </div>
      </div>
    </div>
  );
}