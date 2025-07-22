import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Task } from '@shared/schema';

/**
 * Ultra-fast task completion hook
 * Provides instant UI feedback with optimized cache management
 */
export function useUltraFastTaskToggle(task: Task, projectId?: number) {
  const queryClient = useQueryClient();
  const [optimisticStatus, setOptimisticStatus] = useState(task.status);

  const mutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, {
        status: newStatus,
        completedAt: newStatus === 'completed' ? new Date() : null
      });
      return response.json();
    },
    onMutate: (newStatus) => {
      // INSTANT visual feedback - no waiting
      setOptimisticStatus(newStatus as "completed" | "cancelled" | "todo" | "in_progress" | null);
      
      // Snapshot for rollback
      const snapshot = {
        projectTasks: queryClient.getQueryData(['/api/projects', projectId, 'tasks']),
        allTasks: queryClient.getQueryData(['/api/tasks']),
        dashboardProjects: queryClient.getQueryData(['/api/dashboard/projects-due'])
      };
      
      // Cancel competing queries
      queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      if (projectId) {
        queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        queryClient.cancelQueries({ queryKey: ['/api/dashboard/projects-due'] });
      }
      
      // Ultra-fast cache updates
      const completedAt = newStatus === 'completed' ? new Date() : null;
      
      queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
      );
      
      if (projectId) {
        queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => 
          old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
        );
        
        // Instant progress update
        queryClient.setQueryData(['/api/dashboard/projects-due'], (old: any[] | undefined) => 
          old?.map(project => project.id === projectId && project.tasks ? {
            ...project,
            progress: Math.round((project.tasks.filter((t: any) => 
              t.id === task.id ? newStatus === 'completed' : t.status === 'completed'
            ).length / project.tasks.length) * 100)
          } : project) || old
        );
      }
      
      return snapshot;
    },
    onError: (err, newStatus, context) => {
      // Instant rollback
      setOptimisticStatus(task.status);
      queryClient.setQueryData(['/api/tasks'], context?.allTasks);
      if (projectId) {
        queryClient.setQueryData(['/api/projects', projectId, 'tasks'], context?.projectTasks);
        queryClient.setQueryData(['/api/dashboard/projects-due'], context?.dashboardProjects);
      }
    },
    onSettled: () => {
      // Background refresh for cascading updates
      requestIdleCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        if (projectId) {
          queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
        }
      });
    }
  });

  const toggleStatus = () => {
    const newStatus = optimisticStatus === 'completed' ? 'todo' : 'completed';
    mutation.mutate(newStatus);
  };

  return {
    currentStatus: optimisticStatus,
    toggleStatus,
    isUpdating: mutation.isPending
  };
}