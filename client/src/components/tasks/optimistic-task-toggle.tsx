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
  
  // Add this simple test log
  console.log(`🎯 Component loaded for task ${task.id} with status ${task.status} (projectId: ${projectId})`);

  const toggleMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      console.log(`🔥 API call starting for task ${task.id}`);
      const response = await apiRequest('PATCH', `/api/tasks/${task.id}`, { 
        status: newStatus,
      });
      const result = await response.json();
      console.log(`🔥 API call completed for task ${task.id}:`, result);
      return result;
    },
    onSuccess: (updatedTask) => {
      console.log(`✅ SUCCESS: Task ${task.id} updated to ${updatedTask.status}`);
      
      // SIMPLE: Just invalidate all caches and let them refetch fresh data
      console.log(`🔥 Invalidating all task caches for fresh data...`);
      
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', task.id.toString()] });
      
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
      }
      
      console.log(`🔥 Cache invalidation completed - fresh data will load`);
    },
    onError: (error) => {
      console.error(`❌ ERROR: Failed to update task ${task.id}:`, error);
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    console.log(`🔄 CLICK DETECTED: Toggling task ${task.id} from ${task.status}`);
    console.log(`🔄 isPending: ${toggleMutation.isPending}`);
    
    e.preventDefault();
    e.stopPropagation();
    
    if (toggleMutation.isPending) {
      console.log(`🔄 BLOCKED: Mutation already pending`);
      return;
    }
    
    const newStatus = task.status === 'completed' ? 'todo' : 'completed';
    console.log(`🔄 CALLING MUTATION: ${task.status} -> ${newStatus}`);
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
      title={`Task ${task.id}: ${task.status} - Click to toggle`}
    >
      {isCompleted ? (
        <CheckCircle className={`${iconSize} text-green-600`} />
      ) : (
        <Circle className={`${iconSize} text-gray-400`} />
      )}
    </Button>
  );
}