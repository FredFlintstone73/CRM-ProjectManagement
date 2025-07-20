import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Calendar, User, CheckCircle, Circle, Edit3, Trash2 } from 'lucide-react';
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
  const [, setLocation] = useLocation();

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

  // Get all tasks for the project to find next/previous tasks
  const { data: projectTasks } = useQuery<Task[]>({
    queryKey: ['/api/projects', task?.projectId?.toString(), 'tasks'],
    enabled: !!task?.projectId,
    queryFn: async () => {
      const response = await fetch(`/api/projects/${task?.projectId}/tasks`);
      if (!response.ok) throw new Error('Failed to fetch project tasks');
      return response.json();
    },
  });

  const teamMembers = contacts?.filter(contact => contact.contactType === 'team_member') || [];
  
  // Helper function to format role names
  const formatRole = (role: string) => {
    if (!role) return '';
    return role
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .replace(/Insurance /g, 'Insurance - ')
      .replace(/Ltc/g, 'LTC');
  };

  // Get all assigned team members from direct assignments and role assignments
  const getAssignedTeamMembers = () => {
    if (!task || !teamMembers.length) return [];
    
    const assignedMembers = [];
    
    // Add directly assigned team members (by contact ID)
    if (task.assignedTo) {
      const assignedIds = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
      assignedIds.forEach(contactId => {
        if (contactId) {
          const member = teamMembers.find(tm => tm.id === contactId);
          if (member) assignedMembers.push(member);
        }
      });
    }
    
    // Add team members assigned by role
    if (task.assignedToRole) {
      const assignedRoles = Array.isArray(task.assignedToRole) ? task.assignedToRole : [task.assignedToRole];
      assignedRoles.forEach(role => {
        if (role) {
          const roleMembers = teamMembers.filter(tm => tm.role === role);
          roleMembers.forEach(member => {
            // Only add if not already in the list (avoid duplicates)
            if (!assignedMembers.find(am => am.id === member.id)) {
              assignedMembers.push(member);
            }
          });
        }
      });
    }
    
    return assignedMembers;
  };
  
  const assignedTeamMembers = getAssignedTeamMembers();

  // Sort tasks chronologically and find navigation tasks
  const getSortedTasks = () => {
    if (!projectTasks || !task) return [];
    
    // Sort tasks chronologically: by daysFromMeeting, then dueDate, then sortOrder, then id
    return [...projectTasks].sort((a, b) => {
      // First sort by daysFromMeeting if available
      if (a.daysFromMeeting !== null && b.daysFromMeeting !== null) {
        if (a.daysFromMeeting !== b.daysFromMeeting) {
          return a.daysFromMeeting - b.daysFromMeeting;
        }
      }
      
      // Then by due date if available
      if (a.dueDate && b.dueDate) {
        const aDate = new Date(a.dueDate).getTime();
        const bDate = new Date(b.dueDate).getTime();
        if (aDate !== bDate) {
          return aDate - bDate;
        }
      }
      
      // Then by sortOrder if available
      if (a.sortOrder !== null && b.sortOrder !== null) {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
      }
      
      // Finally by ID as fallback
      return a.id - b.id;
    });
  };

  // Find the next and previous tasks in the sequence
  const findNavigationTasks = () => {
    const sortedTasks = getSortedTasks();
    const currentIndex = sortedTasks.findIndex(t => t.id === task?.id);
    
    return {
      previousTask: currentIndex > 0 ? sortedTasks[currentIndex - 1] : null,
      nextTask: currentIndex >= 0 && currentIndex < sortedTasks.length - 1 ? sortedTasks[currentIndex + 1] : null
    };
  };

  const { previousTask, nextTask } = findNavigationTasks();

  const toggleTaskMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      const updatedTask = await apiRequest('PATCH', `/api/tasks/${id}`, { 
        status: completed ? 'completed' : 'todo' 
      });
      return updatedTask;
    },
    onSuccess: (updatedTask) => {
      // Optimistically update individual task cache
      queryClient.setQueryData(['/api/tasks', id], (oldTask: Task | undefined) => {
        if (!oldTask) return oldTask;
        return { ...oldTask, ...updatedTask };
      });
      
      // Optimistically update global tasks cache
      queryClient.setQueryData(['/api/tasks'], (oldTasks: Task[] | undefined) => {
        if (!oldTasks) return oldTasks;
        return oldTasks.map(task => 
          task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        );
      });
      
      // Optimistically update project tasks cache if task has project
      if (task?.projectId) {
        queryClient.setQueryData(['/api/projects', task.projectId, 'tasks'], (oldTasks: Task[] | undefined) => {
          if (!oldTasks) return oldTasks;
          return oldTasks.map(t => 
            t.id === updatedTask.id ? { ...t, ...updatedTask } : t
          );
        });
      }

      // Only invalidate milestone queries for progress updates
      queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
    },
    onError: () => {
      // On error, revert optimistic updates
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', `/api/tasks/${id}`);
    },
    onSuccess: () => {
      // Remove all cached queries to force fresh data
      queryClient.removeQueries({ queryKey: ['/api/tasks'] });
      if (task?.projectId) {
        queryClient.removeQueries({ queryKey: ['/api/projects', task.projectId.toString(), 'tasks'] });
        queryClient.removeQueries({ queryKey: ['/api/projects', task.projectId.toString()] });
        queryClient.removeQueries({ queryKey: ['/api/projects', task.projectId, 'tasks'] });
        queryClient.removeQueries({ queryKey: ['/api/milestones'] });
      }
      
      // Then invalidate to trigger fresh fetches
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (task?.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', task.projectId.toString(), 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', task.projectId.toString()] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', task.projectId, 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
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
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="outline"
            onClick={() => {
              if (task?.projectId) {
                setLocation(`/projects/${task.projectId}`);
              } else {
                window.history.back();
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {previousTask && (
              <Button
                variant="outline"
                onClick={() => {
                  setLocation(`/task/${previousTask.id}`);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous Task
              </Button>
            )}

            {nextTask && (
              <Button
                variant="outline"
                onClick={() => {
                  setLocation(`/task/${nextTask.id}`);
                }}
              >
                Next Task
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
        
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
                    // Get all assigned team members for subtask
                    const getSubtaskAssignedMembers = (subtaskData) => {
                      const assignedMembers = [];
                      
                      // Add directly assigned team members (handle both array and single value)
                      if (subtaskData.assignedTo) {
                        const assignedIds = Array.isArray(subtaskData.assignedTo) ? subtaskData.assignedTo : [subtaskData.assignedTo];
                        assignedIds.forEach(contactId => {
                          if (contactId) {
                            const member = teamMembers.find(tm => tm.id === contactId);
                            if (member) assignedMembers.push(member);
                          }
                        });
                      }
                      
                      // Add team members assigned by role (handle both array and single value)
                      if (subtaskData.assignedToRole) {
                        const assignedRoles = Array.isArray(subtaskData.assignedToRole) ? subtaskData.assignedToRole : [subtaskData.assignedToRole];
                        assignedRoles.forEach(role => {
                          if (role) {
                            const roleMembers = teamMembers.filter(tm => tm.role === role);
                            roleMembers.forEach(member => {
                              if (!assignedMembers.find(am => am.id === member.id)) {
                                assignedMembers.push(member);
                              }
                            });
                          }
                        });
                      }
                      
                      return assignedMembers;
                    };
                    
                    const subtaskAssignedMembers = getSubtaskAssignedMembers(subtask);
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
                        
                        {subtaskAssignedMembers.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {subtaskAssignedMembers.map(member => (
                              <Badge key={member.id} variant="secondary" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                {member.firstName} {member.lastName}
                              </Badge>
                            ))}
                          </div>
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
              
              {assignedTeamMembers.length > 0 && (
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-gray-500 mt-1" />
                  <div className="flex-1">
                    <span className="text-sm text-gray-500 block mb-2">
                      Assigned to ({assignedTeamMembers.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {assignedTeamMembers.map(member => (
                        <Badge key={member.id} variant="secondary" className="text-xs">
                          <User className="h-3 w-3 mr-1" />
                          {member.firstName} {member.lastName}
                          {member.role && (
                            <span className="ml-1 text-gray-500">
                              ({formatRole(member.role)})
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
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