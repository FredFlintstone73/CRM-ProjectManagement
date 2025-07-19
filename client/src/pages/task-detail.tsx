import { useState } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, User, CheckCircle, Circle, Edit3, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { apiRequest, queryClient } from '@/lib/queryClient';
import TaskForm from '@/components/tasks/task-form';
import { TaskComments } from '@/components/tasks/task-comments';
import type { Task, Contact, Project } from '@shared/schema';

interface TaskDetailParams {
  id: string;
}

export default function TaskDetail() {
  const { id } = useParams<TaskDetailParams>();

  const [isEditing, setIsEditing] = useState(false);

  const { data: task, isLoading: taskLoading } = useQuery<Task>({
    queryKey: ['/api/tasks', id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
  });

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', task?.projectId?.toString()],
    enabled: !!task?.projectId,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${task?.projectId}`);
      if (!response.ok) throw new Error('Failed to fetch project');
      return response.json();
    },
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const { data: parentTask } = useQuery<Task>({
    queryKey: ['/api/tasks', task?.parentTaskId?.toString()],
    enabled: !!task?.parentTaskId,
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${task?.parentTaskId}`);
      if (!response.ok) throw new Error('Failed to fetch parent task');
      return response.json();
    },
  });

  const { data: subtasks } = useQuery<Task[]>({
    queryKey: ['/api/tasks', id, 'subtasks'],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}/subtasks`);
      if (!response.ok) throw new Error('Failed to fetch subtasks');
      return response.json();
    },
  });

  const teamMembers = contacts?.filter(contact => contact.contactType === 'team_member') || [];
  const assignedUser = teamMembers.find(member => member.id === task?.assignedTo);

  const toggleTaskMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      return await apiRequest('PATCH', `/api/tasks/${id}`, { 
        status: completed ? 'completed' : 'todo' 
      });
    },
    onSuccess: () => {
      // Invalidate specific task query
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', id] });
      
      // Invalidate project tasks with all variations of query keys used
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', task.projectId.toString(), 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', task.projectId, 'tasks'] });
        // Also invalidate the hierarchical version used in section-task-manager
        queryClient.invalidateQueries({ 
          predicate: (query) => 
            query.queryKey[0] === '/api/projects' && 
            query.queryKey[1] === task.projectId.toString() && 
            query.queryKey[2] === 'tasks'
        });
      }
      
      // Invalidate general tasks list
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // Force refetch by removing cached data
      if (task?.projectId) {
        queryClient.removeQueries({ queryKey: ['/api/projects', task.projectId.toString(), 'tasks'] });
        queryClient.removeQueries({ queryKey: ['/api/projects', task.projectId, 'tasks'] });
      }
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', task.projectId.toString(), 'tasks'] });
      }
      window.history.back();
    },
  });

  if (taskLoading) {
    return <div className="p-6">Loading task...</div>;
  }

  if (!task) {
    return <div className="p-6">Task not found</div>;
  }

  const isCompleted = task.status === 'completed';
  const cleanDescription = task.description ? 
    task.description.replace(/^\[.*?\]\s*/, '') : '';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => window.history.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => toggleTaskMutation.mutate(!isCompleted)}
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-gray-400" />
              )}
            </Button>
            
            <h1 className={`text-2xl font-bold ${
              isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
            }`}>
              {task.title}
            </h1>
            
            <Badge variant={isCompleted ? 'secondary' : 'default'}>
              {isCompleted ? 'Completed' : 'Todo'}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteTaskMutation.mutate()}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">
                {cleanDescription || 'No description provided'}
              </p>
            </CardContent>
          </Card>

          {subtasks && subtasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Subtasks ({subtasks.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subtasks.map(subtask => {
                    const subtaskAssignedUser = teamMembers.find(member => member.id === subtask.assignedTo);
                    const subtaskCompleted = subtask.status === 'completed';
                    
                    return (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 rounded border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            // Toggle subtask completion
                            apiRequest('PATCH', `/api/tasks/${subtask.id}`, { 
                              status: subtaskCompleted ? 'todo' : 'completed' 
                            }).then(() => {
                              queryClient.invalidateQueries({ queryKey: ['/api/tasks', id, 'subtasks'] });
                            });
                          }}
                        >
                          {subtaskCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        
                        <button
                          className={`flex-1 text-left font-medium hover:text-blue-600 transition-colors ${
                            subtaskCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}
                          onClick={() => {
                            window.location.href = `/task/${subtask.id}`;
                          }}
                        >
                          {subtask.title}
                        </button>
                        
                        {subtaskAssignedUser && (
                          <Badge variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            {subtaskAssignedUser.firstName} {subtaskAssignedUser.lastName}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Comments Section */}
          <TaskComments taskId={parseInt(id)} taskTitle={task.title} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.dueDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              
              {assignedUser && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Assigned to: {assignedUser.firstName} {assignedUser.lastName}
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Priority:</span>
                <Badge variant="outline" className="capitalize">
                  {task.priority}
                </Badge>
              </div>
              
              <Separator />
              
              {project && (
                <div>
                  <span className="text-sm text-gray-500">Project:</span>
                  <button
                    className="block text-sm font-medium text-blue-600 hover:text-blue-700 mt-1"
                    onClick={() => {
                      window.location.href = `/project/${project.id}`;
                    }}
                  >
                    {project.name}
                  </button>
                </div>
              )}
              
              {parentTask && (
                <div>
                  <span className="text-sm text-gray-500">Parent Task:</span>
                  <button
                    className="block text-sm font-medium text-blue-600 hover:text-blue-700 mt-1"
                    onClick={() => {
                      window.location.href = `/task/${parentTask.id}`;
                    }}
                  >
                    {parentTask.title}
                  </button>
                </div>
              )}
              
              <Separator />
              
              <div className="text-xs text-gray-500">
                <div>Created: {format(new Date(task.createdAt), 'MMM d, yyyy')}</div>
                <div>Updated: {format(new Date(task.updatedAt), 'MMM d, yyyy')}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm 
            task={task} 
            projectId={task?.projectId} 
            onSuccess={() => {
              setIsEditing(false);
              queryClient.invalidateQueries({ queryKey: ['/api/tasks', id] });
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}