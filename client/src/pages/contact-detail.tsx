import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Users, Building, Edit, Upload, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Header from "@/components/layout/header";
import ContactForm from "@/components/contacts/contact-form";
import type { Contact } from "@shared/schema";

interface ContactDetailParams {
  id: string;
}

export default function ContactDetail() {
  // All hooks must be called in the same order every time
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { id } = useParams<ContactDetailParams>();
  const [, navigate] = useLocation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: ['/api/contacts', id],
    enabled: isAuthenticated && !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest('PUT', `/api/contacts/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      toast({
        title: "Success",
        description: "Contact status updated successfully",
      });
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
        description: "Failed to update contact status",
        variant: "destructive",
      });
    },
  });

  // All useEffect hooks must be called before any conditional returns
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

  // Set initial profile image if contact has one
  useEffect(() => {
    if (contact?.profileImageUrl) {
      setProfileImageUrl(contact.profileImageUrl);
    }
  }, [contact]);

  // Helper functions
  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'prospect':
        return 'bg-yellow-100 text-yellow-800';
      case 'team_member':
        return 'bg-green-100 text-green-800';
      case 'strategic_partner':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Not specified";
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  const handlePhotoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select a valid image file",
          variant: "destructive",
        });
        return;
      }

      // Create a preview URL
      const previewUrl = URL.createObjectURL(file);
      setProfileImageUrl(previewUrl);

      // In a real app, you would upload the file to a server
      // For now, we'll just show the preview
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    }
  };

  // Early returns after all hooks are called
  if (isLoading || contactLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-lg">Contact not found</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      {/* Header */}
      <Header title="Contact Details" subtitle="View and manage contact information" />

      {/* Main Content */}
      <div className="flex-1 flex p-6 gap-6">
        {/* Left Sidebar */}
        <div className="w-80 space-y-4">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/contacts")}
            className="w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>

          {/* Upload Photo Button */}
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={handlePhotoUpload} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Family Name with Avatar */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profileImageUrl || ""} alt="Family Photo" />
                <AvatarFallback className="bg-gray-100 border-2 border-dashed border-gray-300">
                  {profileImageUrl ? (
                    <img 
                      src={profileImageUrl} 
                      alt="Family Photo" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="h-6 w-6 text-gray-400" />
                  )}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">
                {contact.familyName || `${contact.firstName} ${contact.lastName}`}
              </h2>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Badge className={getContactTypeColor(contact.contactType)}>
                {formatContactType(contact.contactType)}
              </Badge>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(contact.status)}>
                  {contact.status?.charAt(0).toUpperCase() + contact.status?.slice(1) || "Unknown"}
                </Badge>
                <Select value={contact.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-20 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">Cell Phone:</p>
                  <p className="text-sm">{contact.cellPhone || contact.spouseCellPhone || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Email:</p>
                  <p className="text-sm">{contact.personalEmail || contact.workEmail || "Not specified"}</p>
                </div>
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

          {/* Client 2 Information (Spouse) */}
          {contact.spouseFirstName && (
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

          {/* Edit Client Button */}
          <Button 
            className="w-full" 
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Client
          </Button>
          
          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Client Information</DialogTitle>
                <DialogDescription>
                  Update the client's personal information, contact details, and family information.
                </DialogDescription>
              </DialogHeader>
              <ContactForm
                contact={contact}
                onSuccess={() => setIsEditDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Right Main Content */}
        <div className="flex-1">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="family">Family</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              {/* Client 1 Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Client 1 Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">First Name:</p>
                      <p className="text-sm">{contact.firstName || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Name:</p>
                      <p className="text-sm">{contact.lastName || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Nickname:</p>
                      <p className="text-sm">{contact.nickname || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Gender:</p>
                      <p className="text-sm">{formatDisplayValue(contact.gender)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Date of Birth:</p>
                      <p className="text-sm">{formatDate(contact.dateOfBirth)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Date of Death:</p>
                      <p className="text-sm">{formatDate(contact.dateOfDeath)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Cell Phone:</p>
                      <p className="text-sm">{contact.cellPhone || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Work Phone:</p>
                      <p className="text-sm">{contact.workPhone || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Personal Email:</p>
                      <p className="text-sm">{contact.personalEmail || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Work Email:</p>
                      <p className="text-sm">{contact.workEmail || "Not specified"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">ID Type:</p>
                      <p className="text-sm">{formatDisplayValue(contact.idType)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">ID Number:</p>
                      <p className="text-sm">{contact.idNumber || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">ID Expiration:</p>
                      <p className="text-sm">{formatDate(contact.idExpiration)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Client 2 Information (Spouse) */}
              {contact.spouseFirstName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Client 2 (Spouse) Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">First Name:</p>
                        <p className="text-sm">{contact.spouseFirstName || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Last Name:</p>
                        <p className="text-sm">{contact.spouseLastName || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Nickname:</p>
                        <p className="text-sm">{contact.spouseNickname || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Gender:</p>
                        <p className="text-sm">{formatDisplayValue(contact.spouseGender)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date of Birth:</p>
                        <p className="text-sm">{formatDate(contact.spouseDateOfBirth)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Date of Death:</p>
                        <p className="text-sm">{formatDate(contact.spouseDateOfDeath)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Cell Phone:</p>
                        <p className="text-sm">{contact.spouseCellPhone || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Work Phone:</p>
                        <p className="text-sm">{contact.spouseWorkPhone || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Personal Email:</p>
                        <p className="text-sm">{contact.spousePersonalEmail || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Work Email:</p>
                        <p className="text-sm">{contact.spouseWorkEmail || "Not specified"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">ID Type:</p>
                        <p className="text-sm">{formatDisplayValue(contact.spouseIdType)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">ID Number:</p>
                        <p className="text-sm">{contact.spouseIdNumber || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">ID Expiration:</p>
                        <p className="text-sm">{formatDate(contact.spouseIdExpiration)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Marriage Information */}
              {contact.spouseFirstName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Marriage Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Marriage Date:</p>
                        <p className="text-sm">{formatDate(contact.marriageDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Marriage Location:</p>
                        <p className="text-sm">{contact.marriageLocation || "Not specified"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Mailing Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Street Address:</p>
                        <p className="text-sm">{contact.mailingAddress || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">City:</p>
                        <p className="text-sm">{contact.mailingCity || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">State:</p>
                        <p className="text-sm">{contact.mailingState || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">ZIP Code:</p>
                        <p className="text-sm">{contact.mailingZipCode || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Country:</p>
                        <p className="text-sm">{contact.mailingCountry || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2">Home Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Street Address:</p>
                        <p className="text-sm">{contact.homeAddress || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">City:</p>
                        <p className="text-sm">{contact.homeCity || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">State:</p>
                        <p className="text-sm">{contact.homeState || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">ZIP Code:</p>
                        <p className="text-sm">{contact.homeZipCode || "Not specified"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Country:</p>
                        <p className="text-sm">{contact.homeCountry || "Not specified"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="family" className="space-y-6">
              {/* Children Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Children Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const childName = contact[`child${num}Name` as keyof Contact] as string;
                    const childGender = contact[`child${num}Gender` as keyof Contact] as string;
                    const childDob = contact[`child${num}DateOfBirth` as keyof Contact] as string;
                    
                    if (!childName) return null;
                    
                    return (
                      <div key={num} className="border rounded-lg p-4">
                        <h4 className="font-medium text-sm mb-2">Child {num}</h4>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Name:</p>
                            <p className="text-sm">{childName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Gender:</p>
                            <p className="text-sm">{formatDisplayValue(childGender)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Date of Birth:</p>
                            <p className="text-sm">{formatDate(childDob)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {![1, 2, 3, 4, 5, 6, 7].some(num => contact[`child${num}Name` as keyof Contact]) && (
                    <p className="text-sm text-gray-500 text-center py-4">No children information available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional" className="space-y-6">
              {/* Professional Contacts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Professional Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Investment Advisor:</p>
                      <p className="text-sm">{contact.investmentAdvisor || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Tax Professional:</p>
                      <p className="text-sm">{contact.taxProfessional || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Attorney:</p>
                      <p className="text-sm">{contact.attorney || "Not specified"}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Insurance Agent:</p>
                      <p className="text-sm">{contact.insuranceAgent || "Not specified"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Activity placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">No recent activity available</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}