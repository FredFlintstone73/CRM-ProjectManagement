import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useParams, useLocation, useSearch } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Users, Building, Edit, Upload, Camera, StickyNote, FolderOpen, Plus, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Header from "@/components/layout/header";
import ContactForm from "@/components/contacts/contact-form";
import ContactNotes from "@/components/contacts/contact-notes";
import NotesDisplay from "@/components/contacts/notes-display";
import ContactFiles from "@/components/contacts/contact-files";
import type { Contact, Project } from "@shared/schema";

interface ContactDetailParams {
  id: string;
}

export default function ContactDetail() {
  // All hooks must be called in the same order every time

  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const { id } = useParams<ContactDetailParams>();
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Navigate back to contacts page (state will be restored from localStorage)
  const navigateBackToContacts = () => {
    navigate('/contacts');
  };

  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: ['/api/contacts', id],
    enabled: isAuthenticated && !!id,
    staleTime: 0, // Force fresh data
    cacheTime: 0, // Don't cache data
  });

  // Query for projects associated with this contact
  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects', 'client', id],
    queryFn: async () => {
      const response = await fetch(`/api/projects?clientId=${id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    },
    enabled: isAuthenticated && !!id,
  });

  // Query for tasks to calculate progress for each project
  const { data: allTasks } = useQuery({
    queryKey: ['/api/tasks'],
    enabled: isAuthenticated && projects && projects.length > 0,
  });

  // Calculate progress for each project
  const projectsWithProgress = projects?.map(project => {
    const projectTasks = allTasks?.filter((task: any) => task.projectId === project.id) || [];
    const completedTasks = projectTasks.filter((task: any) => task.completed);
    const progress = projectTasks.length > 0 ? (completedTasks.length / projectTasks.length) * 100 : 0;
    return { ...project, progress };
  }) || [];

  // Sort projects by due date (meeting date)
  const sortedProjects = [...projectsWithProgress].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    
    const dateA = new Date(a.dueDate).getTime();
    const dateB = new Date(b.dueDate).getTime();
    
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest('PUT', `/api/contacts/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });

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

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };



  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'prospect':
        return 'bg-green-100 text-green-800';
      case 'team_member':
        return 'bg-purple-100 text-purple-800';
      case 'strategic_partner':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Not specified";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const formatContactType = (type: string) => {
    switch (type) {
      case 'client':
        return 'Client';
      case 'prospect':
        return 'Prospect';
      case 'team_member':
        return 'Team Member';
      case 'strategic_partner':
        return 'Strategic Partner';
      default:
        return type;
    }
  };

  const formatDisplayValue = (value: string | null | undefined) => {
    if (!value) return "Not specified";
    
    // Handle snake_case to Title Case conversion
    if (value.includes('_')) {
      return value
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    // Handle lowercase strings
    if (value === value.toLowerCase()) {
      return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
    
    return value;
  };

  const formatRole = (role: string | null | undefined) => {
    if (!role) return "Not specified";
    
    switch (role) {
      case 'client_service_member':
        return 'Client Service Member';
      case 'admin_assistant':
        return 'Admin Assistant';
      case 'deliverables_team_coordinator':
        return 'Deliverables Team Coordinator';
      case 'estate_attorney':
        return 'Estate Attorney';
      case 'financial_planner':
        return 'Financial Planner';
      case 'human_relations':
        return 'Human Relations';
      case 'insurance_business':
        return 'Insurance Business';
      case 'insurance_health':
        return 'Insurance Health';
      case 'insurance_life_ltc_disability':
        return 'Insurance Life/LTC/Disability';
      case 'insurance_pc':
        return 'Insurance P&C';
      case 'money_manager':
        return 'Money Manager';
      case 'tax_planner':
        return 'Tax Planner';
      case 'trusted_advisor':
        return 'Trusted Advisor';
      case 'accountant':
        return 'Accountant';
      case 'other':
        return 'Other';
      default:
        return formatDisplayValue(role);
    }
  };

  const formatPreferredContactMethod = (method: string | null | undefined) => {
    if (!method) return "Not specified";
    
    switch (method.toLowerCase()) {
      case 'cell phone':
        return 'Cell Phone';
      case 'text':
        return 'Text';
      case 'personal email':
        return 'Personal Email';
      case 'work phone':
        return 'Work Phone';
      case 'work email':
        return 'Work Email';
      case 'mail':
        return 'Mail';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }

      // Convert to base64 and upload
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        setProfileImageUrl(imageUrl);
        uploadPhotoMutation.mutate(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhotoMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      await apiRequest('POST', `/api/contacts/${id}/photo`, { imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        return;
      }

      // Create a preview URL and save it
      const previewUrl = URL.createObjectURL(file);
      setProfileImageUrl(previewUrl);

      // Compress and convert file to base64
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Set max dimensions (reduce file size)
        const maxWidth = 400;
        const maxHeight = 400;
        let { width, height } = img;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Set canvas size and draw compressed image
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convert to base64 with compression (0.8 quality)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        uploadPhotoMutation.mutate(compressedBase64);
      };
      
      img.src = previewUrl;
    }
  };

  // Set initial profile image if contact has one
  useEffect(() => {
    if (contact?.profileImageUrl) {
      setProfileImageUrl(contact.profileImageUrl);
    }
  }, [contact]);

  // Authentication redirect - but only after all hooks are called
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Loading state
  if (isLoading || contactLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Contact not found
  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg">Contact not found</div>
      </div>
    );
  }

  const getDetailPageTitle = () => {
    if (contact.contactType === "client") return "Client Details";
    if (contact.contactType === "prospect") return "Prospect Details";
    if (contact.contactType === "strategic_partner") return "Strategic Partner Details";
    if (contact.contactType === "team_member") return "Team Member Details";
    return "Contact Details";
  };

  const showSidebar = contact.contactType === "client" || contact.contactType === "prospect";

  return (
    <div className="flex-1">
      <Header
        title={contact.familyName || `${contact.firstName} ${contact.lastName}`}
        subtitle={getDetailPageTitle()}
        showActions={false}
      />
      <div className="flex">
        {/* Left Sidebar - only for clients and prospects */}
        {showSidebar && (
          <div className="w-80 bg-white border-r p-6 space-y-6">
          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={navigateBackToContacts}
            className="w-full"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>

          {/* Client Photo */}
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <Avatar className="w-full h-full border-2 border-dashed border-gray-300">
                <AvatarImage src={profileImageUrl || ""} alt="Client Photo" className="object-cover" />
                <AvatarFallback className="text-2xl bg-gray-100">
                  {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                onClick={handlePhotoUpload}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Family Name */}
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">
              {contact.familyName || `${contact.firstName} ${contact.lastName}`}
            </h2>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Badge className={getContactTypeColor(contact.contactType)}>
                  {formatContactType(contact.contactType)}
                </Badge>
                <Badge variant="outline" className={getStatusColor(contact.status || "active")}>
                  {formatDisplayValue(contact.status || "active")}
                </Badge>
              </div>
            </div>
          </div>

          {/* Departments */}
          {contact.departments && contact.departments.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Departments:</p>
              <div className="flex flex-wrap gap-2">
                {contact.departments.map((dept) => (
                  <Badge key={dept} variant="secondary" className="text-xs">
                    {dept}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {contact.contactType === "team_member" || contact.contactType === "strategic_partner" 
                  ? "Contact Information" 
                  : "Client 1"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                {contact.contactType === "client" || contact.contactType === "prospect" ? (
                  contact.nickname && <p className="text-sm text-gray-600">"{contact.nickname}"</p>
                ) : null}
              </div>
              
              {/* Role for team members and strategic partners */}
              {(contact.contactType === "team_member" || contact.contactType === "strategic_partner") && contact.role && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Role:</p>
                  <p className="text-sm">{formatRole(contact.role)}</p>
                </div>
              )}
              
              <div className="space-y-1">
                {/* Phone Number - Show only one, prioritize cell phone */}
                {(contact.contactType === "client" || contact.contactType === "prospect") ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone:</p>
                    <p className="text-sm">{contact.cellPhone || contact.workPhone || "Not specified"}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Cell Phone:</p>
                      <p className="text-sm">{contact.cellPhone || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Work Phone:</p>
                      <p className="text-sm">{contact.workPhone || "Not specified"}</p>
                    </div>
                  </>
                )}
                
                {/* Email Address - Show only one, prioritize personal email */}
                {(contact.contactType === "client" || contact.contactType === "prospect") ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email:</p>
                    <p className="text-sm">{contact.personalEmail || contact.workEmail || "Not specified"}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Personal Email:</p>
                      <p className="text-sm">{contact.personalEmail || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Work Email:</p>
                      <p className="text-sm">{contact.workEmail || "Not specified"}</p>
                    </div>
                  </>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Preferred Contact:</p>
                <p className="text-sm">{formatPreferredContactMethod(contact.preferredContactMethod)}</p>
                {contact.preferredContactMethod === "Cell Phone" && contact.cellPhone && (
                  <p className="text-sm text-blue-600">{contact.cellPhone}</p>
                )}
                {contact.preferredContactMethod === "Text" && contact.cellPhone && (
                  <p className="text-sm text-blue-600">{contact.cellPhone}</p>
                )}
                {contact.preferredContactMethod === "Personal Email" && contact.personalEmail && (
                  <p className="text-sm text-blue-600">{contact.personalEmail}</p>
                )}
                {contact.preferredContactMethod === "Work Phone" && contact.workPhone && (
                  <p className="text-sm text-blue-600">{contact.workPhone}</p>
                )}
                {contact.preferredContactMethod === "Work Email" && contact.workEmail && (
                  <p className="text-sm text-blue-600">{contact.workEmail}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client 2 Information (Spouse) - only for clients and prospects */}
          {contact.spouseFirstName && (contact.contactType === "client" || contact.contactType === "prospect") && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Client 2 (Spouse)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">{contact.spouseFirstName} {contact.spouseLastName}</p>
                  {contact.spouseNickname && <p className="text-sm text-gray-600">"{contact.spouseNickname}"</p>}
                </div>
                <div className="space-y-1">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cell Phone:</p>
                    <p className="text-sm">{contact.spouseCellPhone || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Email:</p>
                    <p className="text-sm">{contact.spousePersonalEmail || contact.spouseWorkEmail || "Not specified"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Preferred Contact:</p>
                  <p className="text-sm">{formatPreferredContactMethod(contact.spousePreferredContactMethod)}</p>
                  {contact.spousePreferredContactMethod === "Cell Phone" && contact.spouseCellPhone && (
                    <p className="text-sm text-blue-600">{contact.spouseCellPhone}</p>
                  )}
                  {contact.spousePreferredContactMethod === "Text" && contact.spouseCellPhone && (
                    <p className="text-sm text-blue-600">{contact.spouseCellPhone}</p>
                  )}
                  {contact.spousePreferredContactMethod === "Personal Email" && contact.spousePersonalEmail && (
                    <p className="text-sm text-blue-600">{contact.spousePersonalEmail}</p>
                  )}
                  {contact.spousePreferredContactMethod === "Work Phone" && contact.spouseWorkPhone && (
                    <p className="text-sm text-blue-600">{contact.spouseWorkPhone}</p>
                  )}
                  {contact.spousePreferredContactMethod === "Work Email" && contact.spouseWorkEmail && (
                    <p className="text-sm text-blue-600">{contact.spouseWorkEmail}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}



          {/* Edit Contact Button */}
          <Button 
            className="w-full" 
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            {contact.contactType === "team_member" || contact.contactType === "strategic_partner" 
              ? "Edit Contact" 
              : "Edit Client"}
          </Button>
          
          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {contact.contactType === "team_member" || contact.contactType === "strategic_partner" 
                    ? "Edit Contact Information" 
                    : "Edit Client Information"}
                </DialogTitle>
                <DialogDescription>
                  {contact.contactType === "team_member" || contact.contactType === "strategic_partner" 
                    ? "Update the contact's personal information and contact details." 
                    : "Update the client's personal information, contact details, and family information."}
                </DialogDescription>
              </DialogHeader>
              <ContactForm 
                contact={contact} 
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  // Force refresh of contact data after successful edit
                  queryClient.removeQueries({ queryKey: ['/api/contacts', id] });
                  queryClient.removeQueries({ queryKey: ['/api/contacts'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/contacts', id] });
                  queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
                }} 
              />
            </DialogContent>
          </Dialog>
          </div>
        )}

        {/* Left Sidebar for Strategic Partners and Team Members */}
        {!showSidebar && (
          <div className="w-80 bg-white border-r border-gray-200 p-6 space-y-6">
            {/* Back to Contacts Button */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={navigateBackToContacts}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>

            {/* Profile Picture */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profileImageUrl || contact.profileImageUrl || ""} alt={`${contact.firstName} ${contact.lastName}`} />
                  <AvatarFallback className="text-xl">
                    {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={handlePhotoUpload}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">{contact.firstName} {contact.lastName}</h2>
                {contact.role && (
                  <p className="text-gray-600">{formatRole(contact.role)}</p>
                )}
              </div>
            </div>

            {/* Departments */}
            {contact.departments && contact.departments.length > 0 && (
              <div className="space-y-2">
                <Label>Departments</Label>
                <div className="flex flex-wrap gap-2">
                  {contact.departments.map((dept) => (
                    <Badge key={dept} variant="secondary" className="text-xs">
                      {dept}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                className="w-full"
                onClick={() => setIsEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Contact
              </Button>
            </div>

            {/* Hidden file input for photo upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />

            {/* Edit Dialog for Strategic Partners and Team Members */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Contact Information</DialogTitle>
                  <DialogDescription>
                    Update the contact's personal information and contact details.
                  </DialogDescription>
                </DialogHeader>
                <ContactForm 
                  contact={contact} 
                  onSuccess={() => {
                    console.log('Contact detail onSuccess called - closing dialog');
                    setIsEditDialogOpen(false);
                    // Refresh the contact data after successful edit
                    queryClient.invalidateQueries({ queryKey: ['/api/contacts', id] });
                    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
                  }} 
                />
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-6">

          {/* Main Content Tabs */}
          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="client">
                {contact.contactType === 'prospect' ? 'Prospect' : 
                 contact.contactType === 'strategic_partner' ? 'Partner' : 
                 contact.contactType === 'team_member' ? 'Member' : 'Client'}
              </TabsTrigger>
              <TabsTrigger value="interaction">Interaction</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

          <TabsContent value="client" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {contact.contactType === "team_member" || contact.contactType === "strategic_partner" 
                      ? "Contact Information" 
                      : "Contact 1"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Full Name:</span>
                      <span>{contact.firstName} {contact.lastName}</span>
                    </div>
                    
                    {/* Role for team members and strategic partners */}
                    {(contact.contactType === "team_member" || contact.contactType === "strategic_partner") && contact.role && (
                      <div className="flex justify-between">
                        <span className="font-medium">Role:</span>
                        <span>{formatRole(contact.role)}</span>
                      </div>
                    )}
                    
                    {/* Fields only for clients and prospects */}
                    {(contact.contactType === "client" || contact.contactType === "prospect") && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium">Nickname:</span>
                          <span>{contact.nickname || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Gender:</span>
                          <span>{formatDisplayValue(contact.gender)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Date of Birth:</span>
                          <span>{formatDate(contact.dateOfBirth)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Date of Death:</span>
                          <span>{formatDate(contact.dateOfDeath) || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">SSN:</span>
                          <span>{contact.ssn || "Not specified"}</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Cell Phone:</span>
                        <span>{contact.cellPhone || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Work Phone:</span>
                        <span>{contact.workPhone || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Personal Email:</span>
                        <span>{contact.personalEmail || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Work Email:</span>
                        <span>{contact.workEmail || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Preferred Contact:</span>
                        <span>{formatDisplayValue(contact.preferredContactMethod)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* ID Information - only for clients and prospects */}
                  {(contact.contactType === "client" || contact.contactType === "prospect") && (
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">ID Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">ID Type:</span>
                          <span>{formatDisplayValue(contact.govIdType)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">ID Number:</span>
                          <span>{contact.govIdNumber || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">ID Expiration:</span>
                          <span>{formatDate(contact.govIdExpiration) || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Address Information Card - positioned to the right for team members and strategic partners */}
              {(contact.contactType === "team_member" || contact.contactType === "strategic_partner") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Address Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Mailing Address</h4>
                        <div className="space-y-1 text-sm">
                          <div>{contact.mailingAddressStreet1}</div>
                          {contact.mailingAddressStreet2 && <div>{contact.mailingAddressStreet2}</div>}
                          <div>{contact.mailingAddressCity}, {contact.mailingAddressState} {contact.mailingAddressZip}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact 2 Information (Spouse) - only for clients and prospects */}
              {contact.spouseFirstName && (contact.contactType === "client" || contact.contactType === "prospect") && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Contact 2
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Full Name:</span>
                        <span>{contact.spouseFirstName} {contact.spouseLastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Nickname:</span>
                        <span>{contact.spouseNickname || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Gender:</span>
                        <span>{formatDisplayValue(contact.spouseGender)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Date of Birth:</span>
                        <span>{formatDate(contact.spouseDateOfBirth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Date of Death:</span>
                        <span>{formatDate(contact.spouseDateOfDeath) || "Not specified"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">SSN:</span>
                        <span>{contact.spouseSSN || "Not specified"}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Cell Phone:</span>
                          <span>{contact.spouseCellPhone || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Work Phone:</span>
                          <span>{contact.spouseWorkPhone || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Personal Email:</span>
                          <span>{contact.spousePersonalEmail || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Work Email:</span>
                          <span>{contact.spouseWorkEmail || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Preferred Contact:</span>
                          <span>{formatDisplayValue(contact.spousePreferredContactMethod)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-semibold mb-2">ID Information</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">ID Type:</span>
                          <span>{formatDisplayValue(contact.spouseGovIdType)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">ID Number:</span>
                          <span>{contact.spouseGovIdNumber || "Not specified"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">ID Expiration:</span>
                          <span>{formatDate(contact.spouseGovIdExpiration) || "Not specified"}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Marriage Information - only for clients and prospects */}
            {contact.marriageDate && (contact.contactType === "client" || contact.contactType === "prospect") && (
              <Card className="mb-6">
                <CardContent className="p-6 pt-6 text-center text-[20px]">
                  <div className="flex justify-center items-center gap-2">
                    <span className="font-medium text-gray-700 text-[16px]">Marriage Date:</span>
                    <span className="text-[16px]">{formatDate(contact.marriageDate)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Address Information - only for clients and prospects (team members and strategic partners have it in the right column) */}
            {(contact.contactType === "client" || contact.contactType === "prospect") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Mailing Address</h4>
                      <div className="space-y-1 text-sm">
                        <div>{contact.mailingAddressStreet1}</div>
                        {contact.mailingAddressStreet2 && <div>{contact.mailingAddressStreet2}</div>}
                        <div>{contact.mailingAddressCity}, {contact.mailingAddressState} {contact.mailingAddressZip}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">Home Address</h4>
                      <div className="space-y-1 text-sm">
                        <div>{contact.homeAddressStreet1 || "Same as mailing"}</div>
                        {contact.homeAddressStreet2 && <div>{contact.homeAddressStreet2}</div>}
                        <div>{contact.homeAddressCity || contact.mailingAddressCity}, {contact.homeAddressState || contact.mailingAddressState} {contact.homeAddressZip || contact.mailingAddressZip}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Vacation Home Address</h4>
                      <div className="space-y-1 text-sm">
                        <div>{contact.vacationAddressStreet1 || "Not specified"}</div>
                        {contact.vacationAddressStreet2 && <div>{contact.vacationAddressStreet2}</div>}
                        {contact.vacationAddressCity && (
                          <div>{contact.vacationAddressCity}, {contact.vacationAddressState} {contact.vacationAddressZip}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Children Information - only for clients and prospects */}
            {(contact.child1FirstName || contact.child2FirstName || contact.child3FirstName) && (contact.contactType === "client" || contact.contactType === "prospect") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Children Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7].map((childNum) => {
                      const firstName = contact[`child${childNum}FirstName` as keyof Contact] as string;
                      const lastName = contact[`child${childNum}LastName` as keyof Contact] as string;
                      const gender = contact[`child${childNum}Gender` as keyof Contact] as string;
                      const dateOfBirth = contact[`child${childNum}DateOfBirth` as keyof Contact] as string;
                      
                      if (!firstName) return null;
                      
                      return (
                        <div key={childNum} className="p-3 border rounded-lg">
                          <h5 className="font-semibold">Child {childNum}</h5>
                          <div className="space-y-1 text-sm">
                            <div><span className="font-medium">Name:</span> {firstName} {lastName}</div>
                            <div><span className="font-medium">Gender:</span> {formatDisplayValue(gender)}</div>
                            <div><span className="font-medium">Date of Birth:</span> {formatDate(dateOfBirth)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Contacts - only for clients and prospects */}
            {(contact.contactType === "client" || contact.contactType === "prospect") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Professional Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Investment Advisor</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Name:</span> {contact.investmentName || "Not specified"}</div>
                        <div><span className="font-medium">Phone:</span> {contact.investmentPhone || "Not specified"}</div>
                        <div><span className="font-medium">Email:</span> {contact.investmentEmail || "Not specified"}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Tax Professional</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Name:</span> {contact.taxName || "Not specified"}</div>
                        <div><span className="font-medium">Phone:</span> {contact.taxPhone || "Not specified"}</div>
                        <div><span className="font-medium">Email:</span> {contact.taxEmail || "Not specified"}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Estate Attorney</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Name:</span> {contact.estateAttyName || "Not specified"}</div>
                        <div><span className="font-medium">Phone:</span> {contact.estateAttyPhone || "Not specified"}</div>
                        <div><span className="font-medium">Email:</span> {contact.estateAttyEmail || "Not specified"}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Property & Casualty Insurance</h4>
                      <div className="space-y-1 text-sm">
                        <div><span className="font-medium">Name:</span> {contact.pncName || "Not specified"}</div>
                        <div><span className="font-medium">Phone:</span> {contact.pncPhone || "Not specified"}</div>
                        <div><span className="font-medium">Email:</span> {contact.pncEmail || "Not specified"}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="interaction" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interaction History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-500 text-center py-8">
                  Interaction history will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    Progress Meetings
                  </CardTitle>
                  <Button 
                    onClick={toggleSortOrder}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                    Sort by Date
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-4 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sortedProjects && sortedProjects.length > 0 ? (
                  <div className="space-y-4">
                    {sortedProjects.map((project) => (
                      <div 
                        key={project.id} 
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FolderOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <Button
                              variant="ghost"
                              className="p-0 h-auto text-left justify-start font-medium text-gray-900 hover:text-primary"
                              onClick={() => navigate(`/projects/${project.id}`)}
                            >
                              {project.name}
                            </Button>
                            <div className="text-sm text-gray-500 mt-1">
                              {project.dueDate && (
                                <span>Meeting Date: {new Date(project.dueDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="text-gray-600">{Math.round(project.progress)}%</span>
                          </div>
                          <Progress value={project.progress} className="h-2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium mb-2">No progress meetings yet</p>
                    <p className="text-sm">This client doesn't have any progress meetings scheduled.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <ContactFiles contactId={parseInt(id || "0")} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <StickyNote className="h-5 w-5" />
                    Notes
                  </span>
                  <Button 
                    onClick={() => setIsNotesDialogOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <StickyNote className="h-4 w-4" />
                    Add Note
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NotesDisplay contactId={parseInt(id || "0")} legacyNotes={contact.notes} />
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Contact Notes Dialog */}
      <ContactNotes 
        contactId={parseInt(id || "0")}
        contactName={contact.familyName || `${contact.firstName} ${contact.lastName}`}
        isOpen={isNotesDialogOpen}
        onClose={() => setIsNotesDialogOpen(false)}
      />
    </div>
  );
}