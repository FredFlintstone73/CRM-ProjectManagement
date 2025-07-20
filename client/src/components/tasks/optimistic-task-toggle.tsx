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
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['/api/projects', projectId, 'tasks']);
      
      // Optimistically update to the new value
      setOptimisticStatus(newStatus);
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: Task[] | undefined) => {
        if (!old) return old;
        return old.map(t => t.id === task.id ? { ...t, status: newStatus } : t);
      });
      
      return { previousTasks };
    },
    onError: (err, newStatus, context) => {
      // Revert optimistic update on error
      setOptimisticStatus(task.status);
      queryClient.setQueryData(['/api/projects', projectId, 'tasks'], context?.previousTasks);
    },
    onSettled: () => {
      // Always refetch after error or success to get the real server state
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      }, 100);
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