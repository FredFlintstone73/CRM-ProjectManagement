import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";

interface TaskFormProps {
  task?: Task | null;
  projectId: number;
  onSuccess?: () => void;
}

export default function TaskForm({ task, projectId, onSuccess }: TaskFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Filter contacts to only show active team members, excluding current user
  const teamMembers = contacts?.filter(contact => 
    contact.contactType === 'team_member' && 
    contact.status === 'active' &&
    contact.personalEmail !== user?.email &&
    contact.workEmail !== user?.email
  ) || [];

  // Get current user's contact ID
  const getCurrentUserContactId = () => {
    if (!user || !contacts) return null;
    const userContact = contacts.find((contact: any) => 
      contact.personalEmail === user.email || 
      contact.workEmail === user.email
    );
    return userContact?.id || null;
  };

  // Determine the correct default value for assignedTo (now supporting arrays)
  const getDefaultAssignedTo = () => {
    if (!task?.assignedTo) return [];
    
    const currentUserContactId = getCurrentUserContactId();
    const assignedToArray = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    
    return assignedToArray.map(id => {
      if (currentUserContactId && id === currentUserContactId) {
        return `me_${user?.id}`;
      }
      return `team_${id}`;
    });
  };

  // State for multi-select components
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task?.dueDate ? new Date(task.dueDate) : undefined
  );
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>(() => 
    Array.isArray(task?.assignedToRole) ? task.assignedToRole : (task?.assignedToRole ? [task.assignedToRole] : [])
  );

  // Initialize assignees when contacts data is available
  useEffect(() => {
    if (contacts && task?.assignedTo) {
      const currentUserContactId = getCurrentUserContactId();
      const assignedToArray = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
      
      const defaultAssignees = assignedToArray.map(id => {
        if (currentUserContactId && id === currentUserContactId) {
          return `me_${user?.id}`;
        }
        return `team_${id}`;
      });
      
      setSelectedAssignees(defaultAssignees);
    }
  }, [contacts, task, user]);

  // Create options for multi-select components
  const assigneeOptions: MultiSelectOption[] = [
    ...(user ? [{
      label: `Assign to Me (${user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email})`,
      value: `me_${user.id}`
    }] : []),
    ...teamMembers.map(member => ({
      label: `${member.firstName} ${member.lastName}`,
      value: `team_${member.id}`
    }))
  ];

  const roleOptions: MultiSelectOption[] = [
    { label: "Accountant", value: "accountant" },
    { label: "Admin Assistant", value: "admin_assistant" },
    { label: "Client Service Rep", value: "client_service_rep" },
    { label: "Deliverables Team Coordinator", value: "deliverables_team_coordinator" },
    { label: "Estate Attorney", value: "estate_attorney" },
    { label: "Estate Planner", value: "estate_planner" },
    { label: "Financial Planner", value: "financial_planner" },
    { label: "Human Relations", value: "human_relations" },
    { label: "Insurance Business", value: "insurance_business" },
    { label: "Insurance Health", value: "insurance_health" },
    { label: "Insurance Life/LTC/Disability", value: "insurance_life_ltc_disability" },
    { label: "Insurance P&C", value: "insurance_pc" },
    { label: "Money Manager", value: "money_manager" },
    { label: "Tax Planner", value: "tax_planner" },
    { label: "Trusted Advisor", value: "trusted_advisor" },
    { label: "Other", value: "other" }
  ];

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      projectId: projectId,
      priority: task?.priority || 25,
      dueDate: task?.dueDate ? new Date(task.dueDate).toISOString() : undefined,
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks';
      const method = task ? 'PATCH' : 'POST';
      return await apiRequest(method, url, data);
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId.toString(), 'tasks'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: task ? "Task updated successfully" : "Task created successfully",
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Task mutation error:", error);
      toast({
        title: task ? "Failed to update task" : "Failed to create task",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertTask) => {
    const processedData = {
      ...data,
      dueDate: dueDate ? dueDate.toISOString() : undefined,
      projectId: projectId,
      assignedTo: selectedAssignees,
      assignedToRole: selectedRoles,
    };
    createTaskMutation.mutate(processedData);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 task-compact">
        {/* Task Title and Priority side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
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

          <div className="space-y-1">
            <Label htmlFor="priority">Priority (1-50)</Label>
            <Select
              value={String(form.watch('priority') || 25)}
              onValueChange={(value) => form.setValue('priority', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                  <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
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

        {/* Assignment and Due Date side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="assignedTo">Assign To People</Label>
            <p className="text-xs text-muted-foreground mb-1">Click to select multiple people</p>
            <MultiSelect
              options={assigneeOptions}
              selected={selectedAssignees}
              onChange={setSelectedAssignees}
              placeholder="Select assignees..."
            />
          </div>

          <div className="space-y-1">
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

        {/* Role Assignment */}
        <div className="space-y-1">
          <Label htmlFor="assignedToRole">Assign To Roles</Label>
          <p className="text-xs text-muted-foreground mb-1">Click to select multiple roles</p>
          <MultiSelect
            options={roleOptions}
            selected={selectedRoles}
            onChange={setSelectedRoles}
            placeholder="Select roles..."
          />
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