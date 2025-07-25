import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

interface OptimisticTaskToggleProps {
  task: Task;
  projectId: number | null;
  className?: string;
  size?: "sm" | "md";
}

export function OptimisticTaskToggle({ task, projectId, className = "", size = "sm" }: OptimisticTaskToggleProps) {
  const queryClient = useQueryClient();
  
  // Use task.status directly instead of separate optimistic state
  const optimisticStatus = task.status;
  
  console.log('=== OPTIMISTIC TOGGLE DEBUG ===');
  console.log('Task:', { id: task.id, title: task.title, status: task.status, projectId: task.projectId });
  console.log('Props:', { projectId, optimisticStatus });
  console.log('===============================');
  
  const toggleMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: newStatus,
      });
      return response.json();
    },
    onMutate: (newStatus) => {
      // INSTANT optimistic update - directly update cache data
      console.log(`OPTIMISTIC: Setting task ${task.id} to ${newStatus}`);
      
      // Snapshot and cancel queries synchronously
      const snapshot = {
        projectTasks: projectId ? queryClient.getQueryData(['/api/projects', projectId, 'tasks']) : null,
        allTasks: queryClient.getQueryData(['/api/tasks']),
        myTasks: queryClient.getQueryData(['/api/tasks/my-tasks-with-priorities']),
        dashboardProjects: queryClient.getQueryData(['/api/dashboard/projects-due'])
      };
      
      if (projectId) {
        queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      }
      queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      queryClient.cancelQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
      queryClient.cancelQueries({ queryKey: ['/api/dashboard/projects-due'] });
      
      // Ultra-optimized cache updates with single-pass operations
      const completedAt = newStatus === 'completed' ? new Date() : null;
      
      if (projectId) {
        queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => 
          old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
        );
      }
      
      queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
      );

      queryClient.setQueryData(['/api/tasks/my-tasks-with-priorities'], (old: any[] | undefined) => 
        old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
      );

      // Update individual task query for Task Details page sync
      queryClient.setQueryData(['/api/tasks', task.id.toString()], (old: Task | undefined) => {
        if (old) {
          console.log(`Updated individual task cache for task ${task.id} with status: ${newStatus}`);
          return { ...old, status: newStatus, completedAt };
        }
        return old;
      });
      
      // Instant progress calculation with optimized logic
      queryClient.setQueryData(['/api/dashboard/projects-due'], (old: any[] | undefined) => 
        old?.map(project => project.id === projectId && project.tasks ? {
          ...project,
          progress: Math.round((project.tasks.filter((t: any) => 
            t.id === task.id ? newStatus === 'completed' : t.status === 'completed'
          ).length / project.tasks.length) * 100)
        } : project) || old
      );
      
      return snapshot;
    },
    onError: (err, newStatus, context) => {
      // Instant rollback with minimal operations
      console.log(`ERROR: Rolling back task ${task.id} to original status`);
      if (projectId && context?.projectTasks) {
        queryClient.setQueryData(['/api/projects', projectId, 'tasks'], context.projectTasks);
      }
      queryClient.setQueryData(['/api/tasks'], context?.allTasks);
      queryClient.setQueryData(['/api/tasks/my-tasks-with-priorities'], context?.myTasks);
      queryClient.setQueryData(['/api/dashboard/projects-due'], context?.dashboardProjects);
    },
    onSuccess: (updatedTask) => {
      console.log('=== SUCCESS HANDLER ===');
      console.log('Task update successful:', updatedTask);
      
      // IMMEDIATE cache updates with server response to prevent flickering
      queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === task.id ? updatedTask : t) || old
      );
      
      queryClient.setQueryData(['/api/tasks/my-tasks-with-priorities'], (old: any[] | undefined) => 
        old?.map(t => t.id === task.id ? { ...t, ...updatedTask } : t) || old
      );
      
      // Update individual task cache for Task Details page
      queryClient.setQueryData(['/api/tasks', task.id.toString()], updatedTask);
      
      console.log('SUCCESS: All caches updated with fresh server data');
      console.log('=========================');
    },
    onSettled: () => {
      // Background cache invalidation - but only after success updates
      setTimeout(() => {
        console.log('Background cache invalidation starting...');
        
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/tasks-overdue'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/tasks-due'] });
        queryClient.invalidateQueries({ queryKey: ['/api/mentions'] });
        
        console.log('Background invalidation completed');
      }, 100);
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    console.log('=== BUTTON CLICKED ===');
    console.log('Button clicked for task:', task.id);
    console.log('Current optimisticStatus:', optimisticStatus);
    console.log('Mutation pending:', toggleMutation.isPending);
    
    e.preventDefault();
    e.stopPropagation();
    
    const newStatus = optimisticStatus === 'completed' ? 'todo' : 'completed';
    console.log('=== TOGGLE CLICK ===');
    console.log('Toggling task', task.id, 'from', optimisticStatus, 'to', newStatus);
    console.log('==================');
    toggleMutation.mutate(newStatus);
  };

  const isCompleted = optimisticStatus === 'completed';
  const buttonSize = size === "sm" ? "h-6 w-6 p-0" : "h-8 w-8 p-0";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <Button
      variant="ghost"
      size="sm"
      className={`${buttonSize} ${className}`}
      onClick={handleClick}
      disabled={toggleMutation.isPending}
    >
      {isCompleted ? (
        <CheckCircle className={`${iconSize} text-green-600`} />
      ) : (
        <Circle className={`${iconSize} text-gray-400`} />
      )}
    </Button>
  );
}