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
    onMutate: async (newStatus) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      await queryClient.cancelQueries({ queryKey: ['/api/tasks'] });
      await queryClient.cancelQueries({ queryKey: ['/api/dashboard/projects-due'] });
      
      // Snapshot the previous values
      const previousProjectTasks = queryClient.getQueryData(['/api/projects', projectId, 'tasks']);
      const previousAllTasks = queryClient.getQueryData(['/api/tasks']);
      const previousDashboardProjects = queryClient.getQueryData(['/api/dashboard/projects-due']);
      
      // Optimistically update to the new value
      setOptimisticStatus(newStatus);
      
      // Update project tasks cache immediately
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      });
      
      // Update global tasks cache immediately
      queryClient.setQueryData(['/api/tasks'], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      });
      
      // Update dashboard projects cache for instant progress bar updates
      queryClient.setQueryData(['/api/dashboard/projects-due'], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map(project => {
          if (project.id === projectId) {
            const updatedProject = { ...project };
            // Recalculate progress immediately
            if (updatedProject.tasks) {
              const completedTasks = updatedProject.tasks.filter((t: any) => 
                t.id === task.id ? newStatus === 'completed' : t.status === 'completed'
              ).length;
              updatedProject.progress = Math.round((completedTasks / updatedProject.tasks.length) * 100);
            }
            return updatedProject;
          }
          return project;
        });
      });
      
      return { previousProjectTasks, previousAllTasks, previousDashboardProjects };
    },
    onError: (err, newStatus, context) => {
      // Revert optimistic updates on error
      setOptimisticStatus(task.status);
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], context?.previousProjectTasks);
      queryClient.setQueryData(['/api/tasks'], context?.previousAllTasks);
      queryClient.setQueryData(['/api/dashboard/projects-due'], context?.previousDashboardProjects);
    },
    onSettled: () => {
      // Immediate background refresh for cascading updates - no delay for maximum responsiveness
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/projects-due'] });
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