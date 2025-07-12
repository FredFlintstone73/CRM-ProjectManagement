import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { insertProjectTemplateSchema } from "@shared/schema";
import type { ProjectTemplate, InsertProjectTemplate } from "@shared/schema";

interface ProjectTemplateFormProps {
  template?: ProjectTemplate;
  onSuccess?: () => void;
}

interface TaskTemplate {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDays: number;
}

export default function ProjectTemplateForm({ template, onSuccess }: ProjectTemplateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tasks, setTasks] = useState<TaskTemplate[]>(
    template?.tasks ? JSON.parse(template.tasks as string) : []
  );

  const form = useForm<InsertProjectTemplate>({
    resolver: zodResolver(insertProjectTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
      tasks: template?.tasks || "[]",
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: InsertProjectTemplate) => {
      const url = template ? `/api/project-templates/${template.id}` : '/api/project-templates';
      const method = template ? 'PUT' : 'POST';
      return await apiRequest(url, {
        method,
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Project template ${template ? 'updated' : 'created'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/project-templates'] });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${template ? 'update' : 'create'} project template`,
        variant: "destructive",
      });
    },
  });

  const addTask = () => {
    setTasks([...tasks, { 
      name: "", 
      description: "", 
      priority: 'medium', 
      estimatedDays: 1 
    }]);
  };

  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const updateTask = (index: number, field: keyof TaskTemplate, value: string | number) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], [field]: value };
    setTasks(updatedTasks);
  };

  const onSubmit = (data: InsertProjectTemplate) => {
    const formData = {
      ...data,
      tasks: JSON.stringify(tasks),
    };
    createTemplateMutation.mutate(formData);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Template Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Financial Road Map Process" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe what this template is for and when to use it..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Template Tasks</h3>
              <Button type="button" variant="outline" size="sm" onClick={addTask}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No tasks defined yet. Add tasks to create a complete project template.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Task {index + 1}</CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTask(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium mb-1 block">Task Name</label>
                          <Input
                            placeholder="e.g., Review client documents"
                            value={task.name}
                            onChange={(e) => updateTask(index, 'name', e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Priority</label>
                          <select
                            className="w-full p-2 border rounded-md"
                            value={task.priority}
                            onChange={(e) => updateTask(index, 'priority', e.target.value)}
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Description</label>
                        <Textarea
                          placeholder="Describe what needs to be done..."
                          value={task.description}
                          onChange={(e) => updateTask(index, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-1 block">Estimated Days</label>
                          <Input
                            type="number"
                            min="1"
                            value={task.estimatedDays}
                            onChange={(e) => updateTask(index, 'estimatedDays', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={createTemplateMutation.isPending}>
            {createTemplateMutation.isPending ? "Saving..." : template ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}