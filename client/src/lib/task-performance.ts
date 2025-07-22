import { QueryClient } from '@tanstack/react-query';
import { Task } from '@shared/schema';

/**
 * Ultra-fast task completion optimizations
 * Provides instant UI updates with minimal overhead
 */

export const createInstantTaskUpdate = (queryClient: QueryClient) => ({
  /**
   * Instantly update task status across all caches
   * Optimized for maximum speed with minimal allocations
   */
  updateTaskStatus: (
    taskId: number, 
    newStatus: 'completed' | 'todo' | 'in_progress' | 'cancelled', 
    projectId?: number
  ) => {
    const completedAt = newStatus === 'completed' ? new Date() : null;
    
    // Ultra-fast cache updates using optional chaining and short-circuit evaluation
    queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => 
      old?.map(t => t.id === taskId ? { ...t, status: newStatus, completedAt } : t) || old
    );
    
    if (projectId) {
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === taskId ? { ...t, status: newStatus, completedAt } : t) || old
      );
      
      // Instant progress bar update
      queryClient.setQueryData(['/api/dashboard/projects-due'], (old: any[] | undefined) => 
        old?.map(project => project.id === projectId && project.tasks ? {
          ...project,
          progress: Math.round((project.tasks.filter((t: any) => 
            t.id === taskId ? newStatus === 'completed' : t.status === 'completed'
          ).length / project.tasks.length) * 100)
        } : project) || old
      );
    }
  },

  /**
   * Rollback task status changes on error
   * Synchronized with updateTaskStatus for consistency
   */
  rollbackTaskStatus: (
    taskId: number, 
    originalStatus: string | null, 
    projectId?: number
  ) => {
    const completedAt = originalStatus === 'completed' ? new Date() : null;
    
    queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => 
      old?.map(t => t.id === taskId ? { ...t, status: originalStatus as any, completedAt } : t) || old
    );
    
    if (projectId) {
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === taskId ? { ...t, status: originalStatus as any, completedAt } : t) || old
      );
      
      queryClient.setQueryData(['/api/dashboard/projects-due'], (old: any[] | undefined) => 
        old?.map(project => project.id === projectId && project.tasks ? {
          ...project,
          progress: Math.round((project.tasks.filter((t: any) => 
            t.id === taskId ? originalStatus === 'completed' : t.status === 'completed'
          ).length / project.tasks.length) * 100)
        } : project) || old
      );
    }
  },

  /**
   * Schedule deferred cache invalidation using browser idle time
   * Ensures cascading updates without blocking UI
   */
  scheduleRefresh: (projectId?: number) => {
    requestIdleCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
        queryClient.invalidateQueries({ queryKey: ['/api/milestones'] });
      }
    });
  }
});

export type TaskPerformanceHelper = ReturnType<typeof createInstantTaskUpdate>;