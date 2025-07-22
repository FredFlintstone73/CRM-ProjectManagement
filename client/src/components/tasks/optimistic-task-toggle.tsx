import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@shared/schema";

interface OptimisticTaskToggleProps {
  task: Task;
  projectId: number;
  className?: string;
  size?: "sm" | "md";
}

export function OptimisticTaskToggle({ task, projectId, className = "", size = "sm" }: OptimisticTaskToggleProps) {
  const queryClient = useQueryClient();
  const [optimisticStatus, setOptimisticStatus] = useState(task.status);
  
  const toggleMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: newStatus,
      });
      return response.json();
    },
    onMutate: (newStatus) => {
      // INSTANT optimistic update - maximum speed with minimal allocations
      setOptimisticStatus(newStatus as "completed" | "cancelled" | "todo" | "in_progress" | null);
      
      // Snapshot and cancel queries synchronously
      const snapshot = {
        projectTasks: queryClient.getQueryData(['/api/projects', projectId, 'tasks']),
        allTasks: queryClient.getQueryData(['/api/tasks']),
        dashboardProjects: queryClient.getQueryData(['/api/dashboard/projects-due'])
      };
      
      queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      queryClient.cancelQueries({ queryKey: ['/api/dashboard/projects-due'] });
      
      // Ultra-optimized cache updates with single-pass operations
      const completedAt = newStatus === 'completed' ? new Date() : null;
      
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
      );
      
      queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => 
        old?.map(t => t.id === task.id ? { ...t, status: newStatus, completedAt } : t) || old
      );
      
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
      setOptimisticStatus(task.status);
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], context?.projectTasks);
      queryClient.setQueryData(['/api/tasks'], context?.allTasks);
      queryClient.setQueryData(['/api/dashboard/projects-due'], context?.dashboardProjects);
    },
    onSettled: () => {
      // Ultra-fast background refresh - fire and forget for cascading updates
      requestIdleCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newStatus = optimisticStatus === 'completed' ? 'todo' : 'completed';
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