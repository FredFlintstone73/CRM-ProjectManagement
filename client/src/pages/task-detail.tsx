import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Calendar,
  User,
  FileText,
  MessageSquare,
  Edit,
  Save,
  X
} from "lucide-react";
import { Link } from "wouter";
import type { Contact } from "@shared/schema";

interface TaskDetailParams {
  templateId: string;
  taskId: string;
}

interface TaskDetail {
  id: string;
  name: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDays: number;
  comments: string;
  parentTaskId?: string;
  subtasks?: TaskDetail[];
}

const taskCommentSchema = z.object({
  comments: z.string().min(1, "Comments are required"),
});

const taskUpdateSchema = z.object({
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  comments: z.string().optional(),
});

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function TaskDetail() {
  const { templateId, taskId } = useParams<TaskDetailParams>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: task, isLoading: taskLoading } = useQuery<TaskDetail>({
    queryKey: ['/api/template-tasks', templateId, taskId],
    queryFn: async () => {
      const response = await fetch(`/api/template-tasks/${templateId}/${taskId}`);
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
    enabled: isAuthenticated && !!templateId && !!taskId,
  });

  const { data: teamMembers } = useQuery<Contact[]>({
    queryKey: ['/api/contacts?type=team_member'],
    queryFn: async () => {
      const response = await fetch('/api/contacts?type=team_member');
      if (!response.ok) throw new Error('Failed to fetch team members');
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const form = useForm<z.infer<typeof taskUpdateSchema>>({
    resolver: zodResolver(taskUpdateSchema),
    defaultValues: {
      assignedTo: task?.assignedTo || "unassigned",
      dueDate: task?.dueDate || "",
      comments: task?.comments || "",
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: z.infer<typeof taskUpdateSchema>) => {
      return await apiRequest(`/api/template-tasks/${templateId}/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/template-tasks', templateId, taskId] });
      setIsEditing(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof taskUpdateSchema>) => {
    updateTaskMutation.mutate(data);
  };

  if (isLoading || taskLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h2>
          <p className="text-gray-500 mb-4">The task you're looking for doesn't exist.</p>
          <Link href={`/templates/${templateId}`}>
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Template
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        title={task.name}
        subtitle="Task Details"
        showActions={false}
      />
      
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="px-6 py-6">
          {/* Back Button */}
          <div className="mb-6">
            <Link href={`/templates/${templateId}`}>
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Template
              </Button>
            </Link>
          </div>

          {/* Task Details Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">{task.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                      </Badge>
                      {task.estimatedDays > 0 && (
                        <Badge variant="outline">
                          {task.estimatedDays} day{task.estimatedDays !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button 
                  variant={isEditing ? "destructive" : "default"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {task.description && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{task.description}</p>
                </div>
              )}

              <Separator className="my-6" />

              {/* Task Assignment and Due Date */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Assigned To
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {teamMembers?.map((member) => (
                                <SelectItem key={member.id} value={member.id.toString()}>
                                  {member.firstName} {member.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Due Date
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              {...field}
                              disabled={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Comments
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Add your comments here..."
                            rows={6}
                            {...field}
                            disabled={!isEditing}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <div className="flex justify-end gap-2">
                      <Button type="submit" disabled={updateTaskMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" />
                        {updateTaskMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Subtasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {task.subtasks.map((subtask, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <Link href={`/templates/${templateId}/tasks/${subtask.id}`}>
                          <h4 className="font-medium text-gray-900 hover:text-blue-600 cursor-pointer">
                            {subtask.name}
                          </h4>
                        </Link>
                        <Badge className={getPriorityColor(subtask.priority)}>
                          {subtask.priority}
                        </Badge>
                      </div>
                      {subtask.description && (
                        <p className="text-sm text-gray-600 mt-2">{subtask.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </>
  );
}