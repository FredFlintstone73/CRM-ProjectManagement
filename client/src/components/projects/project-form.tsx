import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { insertProjectSchema, type InsertProject, type Contact } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface ProjectFormProps {
  onSuccess?: () => void;
}

export default function ProjectForm({ onSuccess }: ProjectFormProps) {
  const { toast } = useToast();
  
  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: null,
      status: "planning",
      projectType: "frm",
      startDate: null,
      endDate: null,
      dueDate: null,
      progress: 0,
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
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Meeting created successfully",
      });
      form.reset();
      onSuccess?.();
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
        description: "Failed to create meeting",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertProject) => {
    // Generate project name based on meeting type
    const meetingTypeNames = {
      frm: "Financial Road Map Interview",
      im: "Implementation Meeting",
      ipu: "Initial Progress Update",
      csr: "Comprehensive Safety Review",
      gpo: "Goals Progress Update",
      tar: "The Annual Review",
    };
    
    const processedData = {
      ...data,
      name: meetingTypeNames[data.projectType as keyof typeof meetingTypeNames],
      clientId: data.clientId || null,
    };
    createProjectMutation.mutate(processedData);
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
              <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}>
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
                  onChange={(e) => field.onChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2">
          <Button type="submit" disabled={createProjectMutation.isPending}>
            {createProjectMutation.isPending ? "Creating..." : "Create Meeting"}
          </Button>
        </div>
      </form>
    </Form>
  );
}