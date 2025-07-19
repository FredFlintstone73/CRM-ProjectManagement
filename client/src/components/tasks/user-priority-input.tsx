import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit3, Check, X } from "lucide-react";

interface UserPriorityInputProps {
  taskId: number;
  currentPriority: number | null;
  taskFilter: 'my_tasks' | 'all_tasks';
}

export function UserPriorityInput({ taskId, currentPriority, taskFilter }: UserPriorityInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(currentPriority?.toString() || "50");
  const queryClient = useQueryClient();

  const updatePriorityMutation = useMutation({
    mutationFn: async (priority: number) => {
      await apiRequest('PUT', `/api/tasks/${taskId}/user-priority`, { priority });
    },
    onSuccess: () => {
      // Invalidate both task queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/my-tasks-with-priorities'] });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    const priority = parseInt(inputValue);
    if (priority >= 1 && priority <= 50) {
      updatePriorityMutation.mutate(priority);
    }
  };

  const handleCancel = () => {
    setInputValue(currentPriority?.toString() || "50");
    setIsEditing(false);
  };

  // Only show this component in "My Tasks" view
  if (taskFilter !== 'my_tasks') {
    return null;
  }

  const displayPriority = currentPriority || 50;

  if (isEditing) {
    return (
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min="1"
          max="50"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="w-16 h-6 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSave}
          disabled={updatePriorityMutation.isPending}
          className="h-6 w-6 p-0"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCancel}
          disabled={updatePriorityMutation.isPending}
          className="h-6 w-6 p-0"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-muted"
        onClick={() => setIsEditing(true)}
      >
        {displayPriority}
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsEditing(true)}
        className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
      >
        <Edit3 className="h-3 w-3" />
      </Button>
    </div>
  );
}