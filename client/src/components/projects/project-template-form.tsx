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
import { Separator } from "@/components/ui/separator";
import { X, Plus, ChevronRight, ChevronDown, GripVertical } from "lucide-react";
import { insertProjectTemplateSchema } from "@shared/schema";
import type { ProjectTemplate, InsertProjectTemplate } from "@shared/schema";

interface ProjectTemplateFormProps {
  template?: ProjectTemplate;
  onSuccess?: () => void;
}

interface TaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  daysFromMeeting: number;
  level: number; // 0 = parent, 1 = child, 2 = grandchild
  parentId?: string;
  sortOrder: number;
  expanded?: boolean;
}

interface SectionTemplate {
  id: string;
  title: string;
  description: string;
  tasks: TaskTemplate[];
  sortOrder: number;
  expanded?: boolean;
}

export default function ProjectTemplateForm({ template, onSuccess }: ProjectTemplateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sections, setSections] = useState<SectionTemplate[]>([]);

  const form = useForm<InsertProjectTemplate>({
    resolver: zodResolver(insertProjectTemplateSchema),
    defaultValues: {
      name: template?.name || "",
      description: template?.description || "",
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: InsertProjectTemplate) => {
      const url = template ? `/api/project-templates/${template.id}` : '/api/project-templates';
      const method = template ? 'PUT' : 'POST';
      
      // Create template with sections and tasks
      const templateData = {
        ...data,
        sections: sections,
      };
      
      return await apiRequest(method, url, templateData);
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

  // Section management functions
  const addSection = () => {
    const newSection: SectionTemplate = {
      id: `section-${Date.now()}`,
      title: "",
      description: "",
      tasks: [],
      sortOrder: sections.length,
      expanded: true,
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (sectionId: string) => {
    setSections(sections.filter(section => section.id !== sectionId));
  };

  const updateSection = (sectionId: string, field: keyof SectionTemplate, value: string | boolean) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, [field]: value } : section
    ));
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, expanded: !section.expanded } : section
    ));
  };

  // Task management functions
  const addTask = (sectionId: string, parentId?: string, level: number = 0) => {
    const newTask: TaskTemplate = {
      id: `task-${Date.now()}`,
      title: "",
      description: "",
      priority: 'medium',
      daysFromMeeting: 0,
      level: level,
      parentId: parentId,
      sortOrder: 0,
      expanded: true,
    };

    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const updatedTasks = [...section.tasks, newTask];
        return { ...section, tasks: updatedTasks };
      }
      return section;
    }));
  };

  const removeTask = (sectionId: string, taskId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const updatedTasks = section.tasks.filter(task => task.id !== taskId && task.parentId !== taskId);
        return { ...section, tasks: updatedTasks };
      }
      return section;
    }));
  };

  const updateTask = (sectionId: string, taskId: string, field: keyof TaskTemplate, value: string | number | boolean) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const updatedTasks = section.tasks.map(task => 
          task.id === taskId ? { ...task, [field]: value } : task
        );
        return { ...section, tasks: updatedTasks };
      }
      return section;
    }));
  };

  const toggleTaskExpanded = (sectionId: string, taskId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId) {
        const updatedTasks = section.tasks.map(task => 
          task.id === taskId ? { ...task, expanded: !task.expanded } : task
        );
        return { ...section, tasks: updatedTasks };
      }
      return section;
    }));
  };

  const onSubmit = (data: InsertProjectTemplate) => {
    createTemplateMutation.mutate(data);
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

  const getTasksByParent = (sectionTasks: TaskTemplate[], parentId?: string) => {
    return sectionTasks.filter(task => task.parentId === parentId);
  };

  const renderTask = (sectionId: string, task: TaskTemplate, level: number = 0) => {
    const childTasks = getTasksByParent(sections.find(s => s.id === sectionId)?.tasks || [], task.id);
    const hasChildren = childTasks.length > 0;
    const indent = level * 24; // 24px per level

    return (
      <div key={task.id} className="space-y-2">
        <Card className={`${level > 0 ? 'border-l-4 border-l-blue-200' : ''}`} style={{ marginLeft: `${indent}px` }}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTaskExpanded(sectionId, task.id)}
                    className="p-1 h-6 w-6"
                  >
                    {task.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </Button>
                )}
                <div className="text-sm font-medium text-gray-600">
                  {level === 0 ? 'Task' : level === 1 ? 'Sub-task' : 'Sub-sub-task'}
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Title</label>
                    <Input
                      placeholder="Enter task title"
                      value={task.title}
                      onChange={(e) => updateTask(sectionId, task.id, 'title', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Priority</label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={task.priority}
                      onChange={(e) => updateTask(sectionId, task.id, 'priority', e.target.value)}
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
                    onChange={(e) => updateTask(sectionId, task.id, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-1 block">Days from Meeting</label>
                    <Input
                      type="number"
                      value={task.daysFromMeeting}
                      onChange={(e) => updateTask(sectionId, task.id, 'daysFromMeeting', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex gap-2">
                    {level < 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addTask(sectionId, task.id, level + 1)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add {level === 0 ? 'Sub-task' : 'Sub-sub-task'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTask(sectionId, task.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {hasChildren && task.expanded && (
          <div className="space-y-2">
            {childTasks.map(childTask => renderTask(sectionId, childTask, level + 1))}
          </div>
        )}
      </div>
    );
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

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Template Sections</h3>
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </Button>
            </div>

            {sections.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No sections defined yet. Add sections to organize your template tasks.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {sections.map((section) => (
                  <Card key={section.id} className="border-2 border-blue-100">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSectionExpanded(section.id)}
                            className="p-1 h-6 w-6"
                          >
                            {section.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                          <CardTitle className="text-lg">Section</CardTitle>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(section.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    {section.expanded && (
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Section Title</label>
                            <Input
                              placeholder="e.g., Planning Phase"
                              value={section.title}
                              onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-1 block">Description</label>
                          <Textarea
                            placeholder="Describe this section..."
                            value={section.description}
                            onChange={(e) => updateSection(section.id, 'description', e.target.value)}
                            rows={2}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-md font-medium">Tasks</h4>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addTask(section.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Task
                            </Button>
                          </div>
                          
                          {section.tasks.length === 0 ? (
                            <div className="text-center text-gray-500 py-4">
                              No tasks in this section yet.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {getTasksByParent(section.tasks, undefined).map(task => renderTask(section.id, task, 0))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={createTemplateMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {createTemplateMutation.isPending ? "Saving..." : template ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}