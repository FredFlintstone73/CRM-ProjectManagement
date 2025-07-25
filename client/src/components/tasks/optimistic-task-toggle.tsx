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

  const toggleMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: newStatus,
      });
      return response.json();
    },
    onSuccess: (updatedTask) => {
      console.log(`✓ Task ${task.id} updated to ${updatedTask.status}`);
      
      // IMMEDIATE synchronous cache updates for all query keys
      const queries = [
        ['/api/tasks'],
        ['/api/tasks/my-tasks-with-priorities'],
        ['/api/tasks', task.id.toString()],
      ];
      
      if (projectId) {
        queries.push(['/api/projects', projectId, 'tasks']);
      }
      
      // Update all caches immediately with server response
      queries.forEach(queryKey => {
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          
          if (Array.isArray(old)) {
            return old.map(item => item.id === task.id ? updatedTask : item);
          } else if (old.id === task.id) {
            return updatedTask;
          }
          
          return old;
        });
      });
      
      // Force immediate cache invalidation to trigger re-renders
      queries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey, exact: true });
      });
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    console.log(`🔄 Toggling task ${task.id} from ${task.status}`);
    
    e.preventDefault();
    e.stopPropagation();
    
    if (toggleMutation.isPending) return;
    
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    toggleMutation.mutate(newStatus);
  };

  const isCompleted = task.status === 'completed';
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