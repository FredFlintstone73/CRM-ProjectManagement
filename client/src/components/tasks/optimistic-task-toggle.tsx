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
  console.log(`🎯 Component rendering with size: ${size}, className: ${className}`);

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
      
      // COMPREHENSIVE CACHE SYNC: Update all possible cache locations immediately
      console.log(`🔥 COMPREHENSIVE cache sync for task ${task.id}...`);
      console.log(`🔥 Updated task data:`, updatedTask);
      
      // 1. Update main tasks list
      queryClient.setQueryData(['/api/tasks'], (old: any) => 
        old?.map((t: any) => t.id === task.id ? updatedTask : t) || old
      );
      
      // 2. Update my tasks with priorities (preserve userPriority field)
      queryClient.setQueryData(['/api/tasks/my-tasks-with-priorities'], (old: any) => 
        old?.map((t: any) => t.id === task.id ? { ...t, ...updatedTask, userPriority: t.userPriority } : t) || old
      );
      
      // 3. Update individual task cache (used by Task Details page)
      // CRITICAL: Task Details page uses string ID from URL params, ensure exact match
      const taskIdString = String(task.id);
      console.log(`🔥 Updating individual task cache with key: ['/api/tasks', '${taskIdString}']`);
      queryClient.setQueryData(['/api/tasks', taskIdString], updatedTask);
      
      // 4. Update project tasks cache if applicable
      if (projectId) {
        queryClient.setQueryData(['/api/projects', projectId, 'tasks'], (old: any) => 
          old?.map((t: any) => t.id === task.id ? updatedTask : t) || old
        );
      }
      
      // 5. Then force refetch as backup to ensure consistency
      requestIdleCallback(() => {
        queryClient.refetchQueries({ queryKey: ['/api/tasks'] });
        queryClient.refetchQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
        queryClient.refetchQueries({ queryKey: ['/api/tasks', taskIdString] });
        
        if (projectId) {
          queryClient.refetchQueries({ queryKey: ['/api/projects', projectId, 'tasks'] });
        }
      });
      
      console.log(`🔥 Comprehensive cache sync completed`);
    },
    onError: (error) => {
      console.error(`❌ ERROR: Failed to update task ${task.id}:`, error);
    }
  });

  const handleClick = (e: React.MouseEvent) => {
    console.log(`🔄 CLICK DETECTED: Toggling task ${task.id} from ${task.status} (in Task Details page)`);
    console.log(`🔄 isPending: ${toggleMutation.isPending}`);
    console.log(`🔄 Event target:`, e.target);
    console.log(`🔄 Current target:`, e.currentTarget);
    
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