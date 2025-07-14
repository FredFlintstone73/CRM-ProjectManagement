import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
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
  drpmDate: z.string().min(1, "DRPM date is required"),
});

type CreateProjectForm = z.infer<typeof createProjectSchema>;

interface CreateFromTemplateDialogProps {
  template: ProjectTemplate;
  children: React.ReactNode;
}

export default function CreateFromTemplateDialog({ template, children }: CreateFromTemplateDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateProjectForm>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectName: "",
      clientId: 0,
      meetingDate: "",
      drpmDate: "",
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

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectForm) => {
      const tasks = Array.isArray(template.tasks) ? template.tasks : [];
      
      // Calculate due dates based on meeting date and DRPM date
      const meetingDate = new Date(data.meetingDate);
      const drpmDate = new Date(data.drpmDate);
      
      const calculatedTasks = tasks.map((task: any) => {
        let dueDate: Date;
        
        if (task.basedOnDrpm) {
          // Calculate based on DRPM date
          dueDate = new Date(drpmDate);
          dueDate.setDate(dueDate.getDate() + task.dueDateOffset);
        } else {
          // Calculate based on meeting date
          dueDate = new Date(meetingDate);
          dueDate.setDate(dueDate.getDate() + task.dueDateOffset);
        }
        
        // Find team member with matching role
        const assignee = teamMembers.find(member => 
          member.role === task.assigneeRole
        );
        
        return {
          title: task.name,
          description: task.description || '',
          priority: task.priority || 'medium',
          status: 'todo',
          dueDate: dueDate.toISOString().split('T')[0],
          assignedTo: assignee?.id || null,
          milestone: task.milestone || '',
          parentTask: task.parentTask || '',
          subTask: task.subTask || '',
          subSubTask: task.subSubTask || '',
        };
      });

      const projectData = {
        name: data.projectName,
        clientId: data.clientId,
        description: `Project created from template: ${template.name}`,
        status: 'active',
        meetingDate: data.meetingDate,
        drpmDate: data.drpmDate,
        tasks: calculatedTasks,
      };

      return await apiRequest('POST', '/api/projects/from-template', projectData);
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
          window.location.href = "/api/login";
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
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'client_service_rep': 'bg-blue-100 text-blue-800',
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

  const tasks = Array.isArray(template.tasks) ? template.tasks : [];
  const milestones = [...new Set(tasks.map((task: any) => task.milestone))];
  const totalTasks = tasks.length;
  const uniqueRoles = [...new Set(tasks.map((task: any) => task.assigneeRole))];

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
                      <FormLabel>Meeting Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          placeholder="Select meeting date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="drpmDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DRPM Date</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          placeholder="Select DRPM date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Due Date Calculation:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Tasks will be automatically assigned due dates based on the meeting date</li>
                  <li>• Post-DRPM tasks will be calculated from the DRPM date</li>
                  <li>• Team members will be auto-assigned based on their roles</li>
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