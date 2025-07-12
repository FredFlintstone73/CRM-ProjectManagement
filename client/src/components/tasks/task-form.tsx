import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { insertTaskSchema, type InsertTask, type Task, type Contact } from "@shared/schema";

interface TaskFormProps {
  task?: Task | null;
  projectId: number;
  onSuccess?: () => void;
}

export default function TaskForm({ task, projectId, onSuccess }: TaskFormProps) {
  const { toast } = useToast();
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate ? new Date(task.dueDate) : undefined
  );

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Filter contacts to only show team members
  const teamMembers = contacts?.filter(contact => contact.contactType === 'team_member') || [];

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      projectId: projectId,
      assigneeId: task?.assigneeId || '',
      priority: task?.priority || 'medium',
      status: task?.status || 'todo',
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : undefined,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PATCH' : 'POST';
      return await apiRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId.toString(), 'tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: task ? "Task updated successfully" : "Task created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: task ? "Failed to update task" : "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTask) => {
    const processedData = {
      ...data,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      projectId: projectId,
    };
    createTaskMutation.mutate(processedData);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Task Title</Label>
          <Input
            id="title"
            {...form.register('title')}
            placeholder="Enter task title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...form.register('description')}
            placeholder="Enter task description"
            rows={3}
          />
          {form.formState.errors.description && (
            <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="assigneeId">Assign To</Label>
            <Select
              value={form.watch('assigneeId') || ''}
              onValueChange={(value) => form.setValue('assigneeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.firstName} {member.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={form.watch('priority')}
              onValueChange={(value) => form.setValue('priority', value as 'low' | 'medium' | 'high')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as 'todo' | 'in_progress' | 'completed' | 'cancelled')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={createTaskMutation.isPending}>
            {createTaskMutation.isPending ? 
              (task ? "Updating..." : "Creating...") : 
              (task ? "Update Task" : "Create Task")
            }
          </Button>
        </div>
      </form>
    </div>
  );
}