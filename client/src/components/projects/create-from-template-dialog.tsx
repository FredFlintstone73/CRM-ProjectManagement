import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Rocket, CalendarDays, Users, Building2 } from "lucide-react";
import type { ProjectTemplate, Contact } from "@shared/schema";
import { format } from "date-fns";

const createProjectSchema = z.object({
  projectName: z.string().min(1, "Project name is required"),
  clientId: z.number().min(1, "Client is required"),
  meetingDate: z.string().min(1, "Meeting date is required"),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

interface CreateFromTemplateDialogProps {
  template: ProjectTemplate;
  children: React.ReactNode;
}

export default function CreateFromTemplateDialog({ template, children }: CreateFromTemplateDialogProps) {
  const [open, setOpen] = useState(false);

  const queryClient = useQueryClient();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectName: "",
      clientId: 0,
      meetingDate: "",
    },
  });

  // Fetch clients for the dropdown
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
    enabled: open,
  });

  const clients = contacts.filter(contact => contact.contactType === 'client');

  // Fetch team members for assignee dropdowns
  const { data: teamMembers = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts', 'team_members'],
    enabled: open,
    queryFn: async () => {
      const response = await fetch('/api/contacts');
      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }
      const allContacts = await response.json();
      return allContacts.filter((contact: Contact) => contact.contactType === 'team_member');
    },
  });

  // Fetch template milestones and tasks from database
  const { data: templateTasks = [] } = useQuery({
    queryKey: ['/api/template-tasks', template.id],
    queryFn: async () => {
      // First get milestones for this template
      const milestonesResponse = await fetch(`/api/milestones?templateId=${template.id}`);
      if (!milestonesResponse.ok) throw new Error('Failed to fetch milestones');
      const milestones = await milestonesResponse.json();
      
      if (!milestones.length) return [];
      
      // Then get tasks for each milestone
      const taskPromises = milestones.map(async (milestone: any) => {
        const response = await fetch(`/api/milestones/${milestone.id}/tasks`);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        const tasks = await response.json();
        return tasks.map((task: any) => ({ ...task, milestone }));
      });
      
      const taskArrays = await Promise.all(taskPromises);
      return taskArrays.flat();
    },
    enabled: open,
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectForm) => {
      try {
        // Validate and parse dates
        const meetingDate = new Date(data.meetingDate);
        
        if (isNaN(meetingDate.getTime())) {
          throw new Error('Invalid date format');
        }
        
        // Create a map of task IDs to tasks for hierarchy resolution
        const taskMap = new Map();
        templateTasks.forEach(task => {
          taskMap.set(task.id, task);
        });
        
        // Function to build task hierarchy path
        const buildTaskHierarchy = (task: any): string => {
          if (!task.parentTaskId) {
            // This is a root task
            return task.title;
          }
          
          const parentTask = taskMap.get(task.parentTaskId);
          if (parentTask) {
            if (parentTask.parentTaskId) {
              // This is a sub-task or sub-sub-task
              const grandParent = taskMap.get(parentTask.parentTaskId);
              if (grandParent) {
                return `    ↳ ${task.title}`;
              } else {
                return `  ↳ ${task.title}`;
              }
            } else {
              // This is a direct task under a root task
              return `  • ${task.title}`;
            }
          }
          
          return task.title;
        };
        
        const calculatedTasks = templateTasks.map((task: any) => {
          let dueDate: Date;
          
          // For now, use a simple offset - we'll make this more sophisticated later
          const daysFromMeeting = 0; // Default offset
          
          // Calculate based on meeting date for now
          dueDate = new Date(meetingDate);
          dueDate.setDate(dueDate.getDate() + daysFromMeeting);
          
          // Build hierarchical title
          const hierarchicalTitle = buildTaskHierarchy(task);
          
          return {
            title: hierarchicalTitle,
            description: task.description || '',
            priority: task.priority || 'medium',
            status: 'todo',
            dueDate: dueDate.toISOString().split('T')[0],
            assignedTo: task.assignedTo || null,
            assignedToRole: task.assignedToRole || null,
            parentTaskId: task.parentTaskId,
            milestoneId: task.milestone?.id || null,
            daysFromMeeting: daysFromMeeting,
          };
        });

        const projectData = {
          name: data.projectName,
          clientId: data.clientId,
          description: `Project created from template: ${template.name}`,
          status: 'active',
          meetingDate: data.meetingDate,
          tasks: calculatedTasks,
        };

        return await apiRequest('POST', '/api/projects/from-template', projectData);
      } catch (error) {
        console.error('Error in createProjectMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Project created successfully from template",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateProjectForm) => {
    createProjectMutation.mutate(data);
  };

  const formatRole = (role: string) => {
    if (!role) return '';
    
    switch (role) {
      case 'accountant':
        return 'Accountant';
      case 'admin_assistant':
        return 'Admin Assistant';
      case 'client_service_member':
        return 'Client Service Member';
      case 'deliverables_team_coordinator':
        return 'Deliverables Team Coordinator';
      case 'estate_attorney':
        return 'Estate Attorney';
      case 'estate_planner':
        return 'Estate Planner';
      case 'financial_planner':
        return 'Financial Planner';
      case 'human_relations':
        return 'Human Relations';
      case 'insurance_business':
        return 'Insurance - Business';
      case 'insurance_health':
        return 'Insurance - Health';
      case 'insurance_life_ltc_disability':
        return 'Insurance - Life, LTC, & Disability';
      case 'insurance_pc':
        return 'Insurance - P&C';
      case 'loan_officer':
        return 'Loan Officer';
      case 'marketing_director':
        return 'Marketing Director';
      case 'money_manager':
        return 'Money Manager';
      case 'strategic_relations_director':
        return 'Strategic Relations Director';
      case 'tax_planner':
        return 'Tax Planner';
      case 'trusted_advisor':
        return 'Trusted Advisor';
      case 'other':
        return 'Other';
      default:
        return role?.charAt(0).toUpperCase() + role?.slice(1) || '';
    }
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'client_service_member': 'bg-blue-100 text-blue-800',
      'financial_planner': 'bg-green-100 text-green-800',
      'estate_attorney': 'bg-purple-100 text-purple-800',
      'tax_planner': 'bg-orange-100 text-orange-800',
      'insurance_life_ltc_disability': 'bg-red-100 text-red-800',
      'insurance_pc': 'bg-red-100 text-red-800',
      'money_manager': 'bg-yellow-100 text-yellow-800',
      'trusted_advisor': 'bg-indigo-100 text-indigo-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const totalTasks = templateTasks.length;
  const milestones = [...new Set(templateTasks.map((task: any) => task.milestone?.title).filter(Boolean))];
  const uniqueRoles = [...new Set(templateTasks.map((task: any) => task.assigneeRole).filter(Boolean))];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5" />
            Create Project from Template
          </DialogTitle>
          <DialogDescription>
            Configure your project settings and team assignments to create a new project from this template.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Template Overview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
            <p className="text-gray-600 mb-4">{template.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-sm">
                  <strong>{totalTasks}</strong> tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  <strong>{milestones.length}</strong> milestones
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm">
                  <strong>{uniqueRoles.length}</strong> roles
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Team Roles Required:</h4>
              <div className="flex flex-wrap gap-2">
                {uniqueRoles.map((role: string) => (
                  <span 
                    key={role} 
                    className={`px-2 py-1 rounded-full text-xs ${getRoleColor(role)}`}
                  >
                    {formatRole(role)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Project Creation Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter project name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select client" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.familyName || `${client.firstName} ${client.lastName}`}
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
                  name="meetingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Due Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          placeholder="Select project due date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Project Creation:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• All template tasks will be created for the new project</li>
                  <li>• Tasks will maintain their hierarchical structure</li>
                  <li>• Task priorities will be preserved from the template</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <>Creating Project...</>
                  ) : (
                    <>
                      <Rocket className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}