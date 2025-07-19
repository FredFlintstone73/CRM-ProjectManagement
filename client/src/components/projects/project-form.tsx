import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import { isUnauthorizedError } from "@/lib/authUtils";
import { insertProjectSchema, type InsertProject, type Project, type Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface ProjectFormProps {
  project?: Project | null;
  onSuccess?: () => void;
}

export default function ProjectForm({ project, onSuccess }: ProjectFormProps) {

  
  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: project?.name || "",
      description: project?.description || "",
      clientId: project?.clientId || null,
      status: project?.status || "planning",
      projectType: project?.projectType || "frm",
      startDate: project?.startDate || "",
      endDate: project?.endDate || "",
      dueDate: project?.dueDate ? new Date(project.dueDate).toISOString().split('T')[0] : "",
      progress: project?.progress || 0,
    },
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  // Get the current meeting type to determine which contacts to show
  const selectedMeetingType = form.watch('projectType');
  
  // Filter contacts based on meeting type
  const filteredContacts = contacts?.filter(contact => {
    // Only show active contacts
    if (contact.status !== 'active') return false;
    
    // For FRM meetings, show prospects
    if (selectedMeetingType === 'frm') {
      return contact.contactType === 'prospect';
    }
    
    // For all other meeting types, show clients
    return contact.contactType === 'client';
  }) || [];

  const createProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      const url = project ? `/api/projects/${project.id}` : "/api/projects";
      const method = project ? "PUT" : "POST";
      const response = await apiRequest(method, url, data);
      return response.json();
    },
    onSuccess: () => {
      if (!project) {
        form.reset();
      }
      onSuccess?.();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const onSubmit = (data: InsertProject) => {
    // Only auto-generate name for new projects
    if (!project) {
      // Generate project name based on meeting type, family name, and date
      const meetingTypeAbbreviations = {
        frm: "FRM",
        im: "IM",
        ipu: "IPU",
        csr: "CSR",
        gpo: "GPO",
        tar: "TAR",
      };
      
      // Get family name from selected contact
      const selectedContact = filteredContacts.find(contact => contact.id === data.clientId);
      const familyName = selectedContact ? (selectedContact.familyName || `${selectedContact.firstName} ${selectedContact.lastName}`) : 'Unknown Family';
      
      // Format date as MM-DD-YY
      let dateString = '';
      if (data.dueDate) {
        const date = new Date(data.dueDate);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        dateString = `${month}-${day}-${year}`;
      }
      
      // Generate project name: "TYPE - Family Name (MM-DD-YY)"
      const meetingType = meetingTypeAbbreviations[data.projectType as keyof typeof meetingTypeAbbreviations];
      const projectName = `${meetingType} - ${familyName}${dateString ? ` (${dateString})` : ''}`;
      
      const processedData = {
        ...data,
        name: projectName,
        clientId: data.clientId || null,
      };
      createProjectMutation.mutate(processedData);
    } else {
      // For editing, use the data as is
      const processedData = {
        ...data,
        clientId: data.clientId || null,
      };
      createProjectMutation.mutate(processedData);
    }
  };

  const meetingTypeOptions = [
    { value: "frm", label: "Financial Road Map Interview (FRM)" },
    { value: "im", label: "Implementation Meeting (IM)" },
    { value: "ipu", label: "Initial Progress Update (IPU)" },
    { value: "csr", label: "Comprehensive Safety Review (CSR)" },
    { value: "gpo", label: "Goals Progress Update (GPO)" },
    { value: "tar", label: "The Annual Review (TAR)" },
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="projectType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Meeting Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select meeting type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {meetingTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
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
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Family Name</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                value={field.value ? field.value.toString() : undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a family" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filteredContacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id.toString()}>
                      {contact.familyName || `${contact.firstName} ${contact.lastName}`}
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
              <FormLabel>Meeting Date *</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      // Parse the date and set it to local time to avoid timezone issues
                      const localDate = new Date(e.target.value + 'T00:00:00');
                      field.onChange(localDate.toISOString());
                    } else {
                      field.onChange(e.target.value);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={createProjectMutation.isPending}>
            {createProjectMutation.isPending ? 
              (project ? "Updating..." : "Creating...") : 
              (project ? "Update Project" : "Create Meeting")
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}