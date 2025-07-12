import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
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

  if (contactLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Contact Not Found</h2>
          <Button onClick={() => navigate("/contacts")}>Back to Contacts</Button>
        </div>
      </div>
    );
  }

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

  // Set initial profile image if contact has one
  useEffect(() => {
    if (contact?.profileImageUrl) {
      setProfileImageUrl(contact.profileImageUrl);
    }
  }, [contact]);

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

  return (
    <div className="flex-1 overflow-auto">
      <Header
        title={contact.familyName || `${contact.firstName} ${contact.lastName}`}
        subtitle="Client Detail"
        showActions={false}
      />
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="w-80 bg-white border-r p-6 space-y-6">
          {/* Back Button */}
          <Button 
            variant="outline" 
            onClick={() => navigate("/contacts")}
            className="w-full"
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
              <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {profileImageUrl ? (
                  <img 
                    src={profileImageUrl} 
                    alt="Family Photo" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Camera className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <h2 className="text-xl font-bold">
                {contact.familyName || `${contact.firstName} ${contact.lastName}`}
              </h2>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Badge className={getContactTypeColor(contact.contactType)}>
                {formatContactType(contact.contactType)}
              </Badge>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <Select
                  value={contact.status || "active"}
                  onValueChange={handleStatusChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue>
                      <Badge variant="outline" className={getStatusColor(contact.status || "active")}>
                        {formatDisplayValue(contact.status || "active")}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Client 1 Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client 1</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-medium">{contact.firstName} {contact.lastName}</p>
                {contact.nickname && <p className="text-sm text-gray-600">"{contact.nickname}"</p>}
              </div>
              <div className="space-y-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">Cell Phone:</p>
                  <p className="text-sm">{contact.cellPhone || "Not specified"}</p>
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
                onSuccess={() => {
                  setIsEditDialogOpen(false);
                  // Refresh the contact data after successful edit
                  queryClient.invalidateQueries({ queryKey: ['/api/contacts', id] });
                  queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
                }} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Main Content Tabs */}
          <Tabs defaultValue="client" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="client">Client</TabsTrigger>
              <TabsTrigger value="interaction">Interaction</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

          <TabsContent value="client" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact 1 Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Contact 1
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Full Name:</span>
                      <span>{contact.firstName} {contact.lastName}</span>
                    </div>
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
                </CardContent>
              </Card>

              {/* Contact 2 Information (Spouse) */}
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
            </div>

            {/* Marriage Information */}
            {contact.marriageDate && (
              <Card className="mb-6">
                <CardContent className="p-6 pt-6 text-center text-[20px]">
                  <div className="flex justify-center items-center gap-2">
                    <span className="font-medium text-gray-700 text-[16px]">Marriage Date:</span>
                    <span className="text-[16px]">{formatDate(contact.marriageDate)}</span>
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

            {/* Children Information */}
            {(contact.child1FirstName || contact.child2FirstName || contact.child3FirstName) && (
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

            {/* Professional Contacts */}
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
                <CardTitle>Related Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-500 text-center py-8">
                  Related projects will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-500 text-center py-8">
                  Files will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-500 text-center py-8">
                  Notes will be displayed here
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}