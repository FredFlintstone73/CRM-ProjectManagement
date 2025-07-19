import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

import { insertContactSchema, type InsertContact, type Contact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ContactFormProps {
  contact?: Contact;
  onSuccess?: () => void;
}

type ContactCategory = "client_prospect" | "team_strategic" | null;
type ContactType = "client" | "prospect" | "team_member" | "strategic_partner";

export default function ContactForm({ contact, onSuccess }: ContactFormProps) {

  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState<ContactCategory>(
    contact ? (contact.contactType === "client" || contact.contactType === "prospect" ? "client_prospect" : "team_strategic") : null
  );
  const [selectedType, setSelectedType] = useState<ContactType | null>(contact?.contactType || null);

  const [sameAsMailingAddress, setSameAsMailingAddress] = useState(
    contact ? contact.sameAsMailingAddress === "yes" : false
  );

  // Role options for team members and strategic partners (alphabetical order with "Other" last)
  const roleOptions = [
    { value: "accountant", label: "Accountant" },
    { value: "admin_assistant", label: "Admin Assistant" },
    { value: "client_service_rep", label: "Client Service Rep" },
    { value: "deliverables_team_coordinator", label: "Deliverables Team Coordinator" },
    { value: "estate_attorney", label: "Estate Attorney" },
    { value: "financial_planner", label: "Financial Planner" },
    { value: "human_relations", label: "Human Relations" },
    { value: "insurance_business", label: "Insurance - Business" },
    { value: "insurance_health", label: "Insurance - Health" },
    { value: "insurance_life_ltc_disability", label: "Insurance - Life, LTC, & Disability" },
    { value: "insurance_pc", label: "Insurance - P&C" },
    { value: "money_manager", label: "Money Manager" },
    { value: "tax_planner", label: "Tax Planner" },
    { value: "trusted_advisor", label: "Trusted Advisor" },
    { value: "other", label: "Other" },
  ];

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema.partial()),
    mode: "onChange",
    defaultValues: contact ? {
      familyName: contact.familyName || "",
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      nickname: contact.nickname || "",
      gender: contact.gender || "",
      ssn: contact.ssn || "",
      govIdType: contact.govIdType || "",
      govIdNumber: contact.govIdNumber || "",
      govIdExpiration: contact.govIdExpiration ? new Date(contact.govIdExpiration) : undefined,
      dateOfBirth: contact.dateOfBirth ? new Date(contact.dateOfBirth) : undefined,
      dateOfDeath: contact.dateOfDeath ? new Date(contact.dateOfDeath) : undefined,
      cellPhone: contact.cellPhone || "",
      personalEmail: contact.personalEmail || "",
      workPhone: contact.workPhone || "",
      workEmail: contact.workEmail || "",
      preferredContactMethod: contact.preferredContactMethod || "",
      spouseFirstName: contact.spouseFirstName || "",
      spouseLastName: contact.spouseLastName || "",
      spouseNickname: contact.spouseNickname || "",
      spouseGender: contact.spouseGender || "",
      spouseSSN: contact.spouseSSN || "",
      spouseGovIdType: contact.spouseGovIdType || "",
      spouseGovIdNumber: contact.spouseGovIdNumber || "",
      spouseGovIdExpiration: contact.spouseGovIdExpiration ? new Date(contact.spouseGovIdExpiration) : undefined,
      spouseDateOfBirth: contact.spouseDateOfBirth ? new Date(contact.spouseDateOfBirth) : undefined,
      spouseDateOfDeath: contact.spouseDateOfDeath ? new Date(contact.spouseDateOfDeath) : undefined,
      marriageDate: contact.marriageDate ? new Date(contact.marriageDate) : undefined,
      spouseCellPhone: contact.spouseCellPhone || "",
      spousePersonalEmail: contact.spousePersonalEmail || "",
      spouseWorkPhone: contact.spouseWorkPhone || "",
      spouseWorkEmail: contact.spouseWorkEmail || "",
      spousePreferredContactMethod: contact.spousePreferredContactMethod || "",
      mailingAddressStreet1: contact.mailingAddressStreet1 || "",
      mailingAddressStreet2: contact.mailingAddressStreet2 || "",
      mailingAddressCity: contact.mailingAddressCity || "",
      mailingAddressState: contact.mailingAddressState || "",
      mailingAddressZip: contact.mailingAddressZip || "",
      homeAddressStreet1: contact.homeAddressStreet1 || "",
      homeAddressStreet2: contact.homeAddressStreet2 || "",
      homeAddressCity: contact.homeAddressCity || "",
      homeAddressState: contact.homeAddressState || "",
      homeAddressZip: contact.homeAddressZip || "",
      vacationAddressStreet1: contact.vacationAddressStreet1 || "",
      vacationAddressStreet2: contact.vacationAddressStreet2 || "",
      vacationAddressCity: contact.vacationAddressCity || "",
      vacationAddressState: contact.vacationAddressState || "",
      vacationAddressZip: contact.vacationAddressZip || "",
      child1FirstName: contact.child1FirstName || "",
      child1LastName: contact.child1LastName || "",
      child1Gender: contact.child1Gender || "",
      child1DateOfBirth: contact.child1DateOfBirth ? new Date(contact.child1DateOfBirth) : undefined,
      child1DateOfDeath: contact.child1DateOfDeath ? new Date(contact.child1DateOfDeath) : undefined,
      child2FirstName: contact.child2FirstName || "",
      child2LastName: contact.child2LastName || "",
      child2Gender: contact.child2Gender || "",
      child2DateOfBirth: contact.child2DateOfBirth ? new Date(contact.child2DateOfBirth) : undefined,
      child2DateOfDeath: contact.child2DateOfDeath ? new Date(contact.child2DateOfDeath) : undefined,
      child3FirstName: contact.child3FirstName || "",
      child3LastName: contact.child3LastName || "",
      child3Gender: contact.child3Gender || "",
      child3DateOfBirth: contact.child3DateOfBirth ? new Date(contact.child3DateOfBirth) : undefined,
      child3DateOfDeath: contact.child3DateOfDeath ? new Date(contact.child3DateOfDeath) : undefined,
      child4FirstName: contact.child4FirstName || "",
      child4LastName: contact.child4LastName || "",
      child4Gender: contact.child4Gender || "",
      child4DateOfBirth: contact.child4DateOfBirth ? new Date(contact.child4DateOfBirth) : undefined,
      child4DateOfDeath: contact.child4DateOfDeath ? new Date(contact.child4DateOfDeath) : undefined,
      child5FirstName: contact.child5FirstName || "",
      child5LastName: contact.child5LastName || "",
      child5Gender: contact.child5Gender || "",
      child5DateOfBirth: contact.child5DateOfBirth ? new Date(contact.child5DateOfBirth) : undefined,
      child5DateOfDeath: contact.child5DateOfDeath ? new Date(contact.child5DateOfDeath) : undefined,
      child6FirstName: contact.child6FirstName || "",
      child6LastName: contact.child6LastName || "",
      child6Gender: contact.child6Gender || "",
      child6DateOfBirth: contact.child6DateOfBirth ? new Date(contact.child6DateOfBirth) : undefined,
      child6DateOfDeath: contact.child6DateOfDeath ? new Date(contact.child6DateOfDeath) : undefined,
      child7FirstName: contact.child7FirstName || "",
      child7LastName: contact.child7LastName || "",
      child7Gender: contact.child7Gender || "",
      child7DateOfBirth: contact.child7DateOfBirth ? new Date(contact.child7DateOfBirth) : undefined,
      child7DateOfDeath: contact.child7DateOfDeath ? new Date(contact.child7DateOfDeath) : undefined,
      investmentName: contact.investmentName || "",
      investmentPhone: contact.investmentPhone || "",
      investmentEmail: contact.investmentEmail || "",
      taxName: contact.taxName || "",
      taxPhone: contact.taxPhone || "",
      taxEmail: contact.taxEmail || "",
      estateAttyName: contact.estateAttyName || "",
      estateAttyPhone: contact.estateAttyPhone || "",
      estateAttyEmail: contact.estateAttyEmail || "",
      pncName: contact.pncName || "",
      pncPhone: contact.pncPhone || "",
      pncEmail: contact.pncEmail || "",
      contactType: contact.contactType || "client",
      status: contact.status || "active",
      departments: contact.departments || [],

    } : {
      firstName: "",
      lastName: "",
      contactType: "client",
      status: "active",
      departments: [],

    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      console.log('Mutation function called with data:', data);
      console.log('Contact exists:', !!contact);
      
      if (contact) {
        console.log('Making PUT request to:', `/api/contacts/${contact.id}`);
        await apiRequest("PUT", `/api/contacts/${contact.id}`, data);
      } else {
        console.log('Making POST request to:', "/api/contacts");
        await apiRequest("POST", "/api/contacts", data);
      }
    },
    onSuccess: () => {
      // Invalidate and refetch contact queries
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      if (contact) {
        queryClient.invalidateQueries({ queryKey: ['/api/contacts', contact.id.toString()] });
      }
      
      toast({
        title: contact ? "Contact updated" : "Contact created",
        description: contact ? "The contact has been successfully updated." : "The contact has been successfully created.",
      });
      if (!contact) {
        form.reset();
      }
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
      
      // Get the actual error message from the server response
      const errorMessage = error.message || "An unknown error occurred";
      
      toast({
        title: "Error",
        description: `${contact ? "Failed to update contact" : "Failed to create contact"}: ${errorMessage}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    // Check if form has validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      return;
    }
    
    // Clean up the data to handle undefined/null values and convert dates
    const cleanedData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        // Convert Date objects to ISO strings for the server
        if (value instanceof Date) {
          return [key, value.toISOString()];
        }
        // Convert empty strings to null for proper database updates
        if (value === "") {
          return [key, null];
        }
        return [key, value];
      }).filter(([_, value]) => value !== undefined)
    ) as InsertContact;
    
    mutation.mutate(cleanedData);
  };

  const handleSameAsMailingAddress = (value: string) => {
    const isSame = value === "yes";
    setSameAsMailingAddress(isSame);
    
    if (isSame) {
      // Auto-populate home address with mailing address values
      const mailingStreet1 = form.getValues("mailingAddressStreet1");
      const mailingStreet2 = form.getValues("mailingAddressStreet2");
      const mailingCity = form.getValues("mailingAddressCity");
      const mailingState = form.getValues("mailingAddressState");
      const mailingZip = form.getValues("mailingAddressZip");
      
      form.setValue("homeAddressStreet1", mailingStreet1);
      form.setValue("homeAddressStreet2", mailingStreet2);
      form.setValue("homeAddressCity", mailingCity);
      form.setValue("homeAddressState", mailingState);
      form.setValue("homeAddressZip", mailingZip);
    }
  };

  // Handle category selection
  const handleCategorySelect = (category: ContactCategory) => {
    setSelectedCategory(category);
    setSelectedType(null);
    // Reset form when category changes
    form.reset();
  };

  // Handle type selection
  const handleTypeSelect = (type: ContactType) => {
    setSelectedType(type);
    form.setValue("contactType", type);
  };

  // If no category is selected (new contact), show selection screen
  if (!selectedCategory && !contact) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Choose Contact Type</h3>
          <p className="text-sm text-gray-600 mb-6">Select the type of contact you want to create</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleCategorySelect("client_prospect")}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Client or Prospect</CardTitle>
              <CardDescription>
                Individuals or families who are clients or potential clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>• Complete client information</p>
                <p>• Family and spouse details</p>
                <p>• Address and contact information</p>
                <p>• Children and professional contacts</p>
              </div>
            </CardContent>
          </Card>
          
          <Card 
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => handleCategorySelect("team_strategic")}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Strategic Partner or
              Team Member</CardTitle>
              <CardDescription>
                Team members, strategic partners, or professional contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">
                <p>• Basic contact information</p>
                <p>• Professional role</p>
                <p>• Contact methods</p>
                <p>• Mailing address</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If category is selected but not type, show type selection
  if (selectedCategory && !selectedType) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">
            {selectedCategory === "client_prospect" ? "Client or Prospect?" : "Strategic Partner or Team Member?"}
          </h3>
          <p className="text-sm text-gray-600 mb-6">Choose the specific type</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedCategory === "client_prospect" ? (
            <>
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleTypeSelect("client")}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Client</CardTitle>
                  <CardDescription>Existing client</CardDescription>
                </CardHeader>
              </Card>
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleTypeSelect("prospect")}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Prospect</CardTitle>
                  <CardDescription>Potential client</CardDescription>
                </CardHeader>
              </Card>
            </>
          ) : (
            <>
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleTypeSelect("strategic_partner")}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Strategic Partner</CardTitle>
                  <CardDescription>External strategic partner</CardDescription>
                </CardHeader>
              </Card>
              <Card 
                className="cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleTypeSelect("team_member")}
              >
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">Team Member</CardTitle>
                  <CardDescription>Internal team member</CardDescription>
                </CardHeader>
              </Card>
            </>
          )}
        </div>
        
        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => setSelectedCategory(null)}
          >
            Back to Category Selection
          </Button>
        </div>
      </div>
    );
  }

  // Render the appropriate form based on selected type
  if (selectedType === "team_member" || selectedType === "strategic_partner") {
    return (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {selectedType === "team_member" ? "Team Member" : "Strategic Partner"} Information
          </h3>
          {!contact && (
            <Button 
              type="button"
              variant="outline" 
              onClick={() => setSelectedType(null)}
            >
              Back
            </Button>
          )}
        </div>
        
        {/* Simplified form for team members and strategic partners */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              {...form.register("firstName")}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              {...form.register("lastName")}
              placeholder="Enter last name"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="cellPhone">Cell Phone</Label>
            <Input
              id="cellPhone"
              {...form.register("cellPhone")}
              placeholder="Enter cell phone"
            />
          </div>
          <div>
            <Label htmlFor="workPhone">Work Phone</Label>
            <Input
              id="workPhone"
              {...form.register("workPhone")}
              placeholder="Enter work phone"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="personalEmail">Personal Email</Label>
            <Input
              id="personalEmail"
              type="email"
              {...form.register("personalEmail")}
              placeholder="Enter personal email"
            />
          </div>
          <div>
            <Label htmlFor="workEmail">Work Email</Label>
            <Input
              id="workEmail"
              type="email"
              {...form.register("workEmail")}
              placeholder="Enter work email"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
            <Select 
              onValueChange={(value) => form.setValue("preferredContactMethod", value)}
              defaultValue={contact?.preferredContactMethod || undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select contact method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cell">Cell Phone</SelectItem>
                <SelectItem value="work">Work Phone</SelectItem>
                <SelectItem value="personal_email">Personal Email</SelectItem>
                <SelectItem value="work_email">Work Email</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="role">Role *</Label>
            <Select 
              onValueChange={(value) => form.setValue("role", value)}
              defaultValue={contact?.role || undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Departments */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Departments</h4>
          <p className="text-sm text-gray-600">Select the departments this contact is working with</p>
          <div className="flex gap-6">
            {["Accounting", "Planning", "Tax"].map((dept) => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={dept}
                  checked={form.watch("departments")?.includes(dept)}
                  onCheckedChange={(checked) => {
                    const currentDepts = form.watch("departments") || [];
                    const newDepts = checked
                      ? [...currentDepts, dept]
                      : currentDepts.filter(d => d !== dept);
                    form.setValue("departments", newDepts);
                  }}
                />
                <Label htmlFor={dept} className="cursor-pointer">{dept}</Label>
              </div>
            ))}
          </div>
        </div>

        {/* Mailing Address */}
        <div className="space-y-4">
          <h4 className="text-md font-medium">Mailing Address</h4>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="mailingAddressStreet1">Street Address 1</Label>
              <Input
                id="mailingAddressStreet1"
                {...form.register("mailingAddressStreet1")}
                placeholder="Enter street address"
              />
            </div>
            <div>
              <Label htmlFor="mailingAddressStreet2">Street Address 2</Label>
              <Input
                id="mailingAddressStreet2"
                {...form.register("mailingAddressStreet2")}
                placeholder="Enter street address 2 (optional)"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="mailingAddressCity">City</Label>
                <Input
                  id="mailingAddressCity"
                  {...form.register("mailingAddressCity")}
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="mailingAddressState">State</Label>
                <Input
                  id="mailingAddressState"
                  {...form.register("mailingAddressState")}
                  placeholder="Enter state"
                />
              </div>
              <div>
                <Label htmlFor="mailingAddressZip">ZIP Code</Label>
                <Input
                  id="mailingAddressZip"
                  {...form.register("mailingAddressZip")}
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select 
            onValueChange={(value) => form.setValue("status", value)}
            defaultValue={contact?.status || undefined}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : (contact ? "Update Contact" : "Create Contact")}
          </Button>
          <Button type="button" variant="outline" onClick={() => form.reset()}>
            Reset Form
          </Button>
        </div>
      </form>
    );
  }

  // Original full form for clients and prospects
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {selectedType === "client" ? "Client" : "Prospect"} Information
        </h3>
        {!contact && (
          <Button 
            type="button"
            variant="outline" 
            onClick={() => setSelectedType(null)}
          >
            Back
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="family" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="family">Family</TabsTrigger>
          <TabsTrigger value="address">Address</TabsTrigger>
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="professionals">Professionals</TabsTrigger>
        </TabsList>

        <TabsContent value="family" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Family Information</CardTitle>
              <CardDescription>Essential client and family information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="familyName">Family Name</Label>
                <Input
                  id="familyName"
                  {...form.register("familyName")}
                  placeholder="Enter family name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactType">Contact Type</Label>
                  <Select 
                    value={form.watch("contactType")} 
                    onValueChange={(value) => form.setValue("contactType", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="strategic_partner">Strategic Partner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={form.watch("status")} 
                    onValueChange={(value) => form.setValue("status", value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Departments */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Departments</Label>
                <p className="text-sm text-gray-600">Select the departments this contact is working with</p>
                <div className="flex gap-6">
                  {["Accounting", "Planning", "Tax"].map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox
                        id={dept}
                        checked={form.watch("departments")?.includes(dept)}
                        onCheckedChange={(checked) => {
                          const currentDepts = form.watch("departments") || [];
                          const newDepts = checked
                            ? [...currentDepts, dept]
                            : currentDepts.filter(d => d !== dept);
                          form.setValue("departments", newDepts);
                        }}
                      />
                      <Label htmlFor={dept} className="cursor-pointer">{dept}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact 1 Section */}
          <Card>
            <CardHeader>
              <CardTitle>Contact 1</CardTitle>
              <CardDescription>Primary contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    placeholder="Enter first name"
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    placeholder="Enter last name"
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nickname">Nickname</Label>
                  <Input
                    id="nickname"
                    {...form.register("nickname")}
                    placeholder="Enter nickname"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={form.watch("gender")} onValueChange={(value) => form.setValue("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...form.register("dateOfBirth")}
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfDeath">Date of Death</Label>
                  <Input
                    id="dateOfDeath"
                    type="date"
                    {...form.register("dateOfDeath")}
                  />
                </div>
                <div>
                  <Label htmlFor="ssn">SSN</Label>
                  <Input
                    id="ssn"
                    {...form.register("ssn")}
                    placeholder="Enter SSN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="govIdType">ID Type</Label>
                  <Select value={form.watch("govIdType")} onValueChange={(value) => form.setValue("govIdType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="state_id">State ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="govIdNumber">ID Number</Label>
                  <Input
                    id="govIdNumber"
                    {...form.register("govIdNumber")}
                    placeholder="Enter ID number"
                  />
                </div>
                <div>
                  <Label htmlFor="govIdExpiration">ID Expiration</Label>
                  <Input
                    id="govIdExpiration"
                    type="date"
                    {...form.register("govIdExpiration")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cellPhone">Cell Phone</Label>
                  <Input
                    id="cellPhone"
                    {...form.register("cellPhone")}
                    placeholder="Enter cell phone"
                  />
                </div>
                <div>
                  <Label htmlFor="workPhone">Work Phone</Label>
                  <Input
                    id="workPhone"
                    {...form.register("workPhone")}
                    placeholder="Enter work phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personalEmail">Personal Email</Label>
                  <Input
                    id="personalEmail"
                    type="email"
                    {...form.register("personalEmail")}
                    placeholder="Enter personal email"
                  />
                </div>
                <div>
                  <Label htmlFor="workEmail">Work Email</Label>
                  <Input
                    id="workEmail"
                    type="email"
                    {...form.register("workEmail")}
                    placeholder="Enter work email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select value={form.watch("preferredContactMethod")} onValueChange={(value) => form.setValue("preferredContactMethod", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cell">Cell Phone</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="work_phone">Work Phone</SelectItem>
                    <SelectItem value="personal_email">Personal Email</SelectItem>
                    <SelectItem value="work_email">Work Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Contact 2 Section */}
          <Card>
            <CardHeader>
              <CardTitle>Contact 2</CardTitle>
              <CardDescription>Spouse/partner information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouseFirstName">First Name</Label>
                  <Input
                    id="spouseFirstName"
                    {...form.register("spouseFirstName")}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="spouseLastName">Last Name</Label>
                  <Input
                    id="spouseLastName"
                    {...form.register("spouseLastName")}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouseNickname">Nickname</Label>
                  <Input
                    id="spouseNickname"
                    {...form.register("spouseNickname")}
                    placeholder="Enter nickname"
                  />
                </div>
                <div>
                  <Label htmlFor="spouseGender">Gender</Label>
                  <Select value={form.watch("spouseGender")} onValueChange={(value) => form.setValue("spouseGender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="spouseDateOfBirth">Date of Birth</Label>
                  <Input
                    id="spouseDateOfBirth"
                    type="date"
                    {...form.register("spouseDateOfBirth")}
                  />
                </div>
                <div>
                  <Label htmlFor="spouseDateOfDeath">Date of Death</Label>
                  <Input
                    id="spouseDateOfDeath"
                    type="date"
                    {...form.register("spouseDateOfDeath")}
                  />
                </div>
                <div>
                  <Label htmlFor="spouseSSN">SSN</Label>
                  <Input
                    id="spouseSSN"
                    {...form.register("spouseSSN")}
                    placeholder="Enter SSN"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="spouseGovIdType">ID Type</Label>
                  <Select value={form.watch("spouseGovIdType")} onValueChange={(value) => form.setValue("spouseGovIdType", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select ID type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="state_id">State ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="spouseGovIdNumber">ID Number</Label>
                  <Input
                    id="spouseGovIdNumber"
                    {...form.register("spouseGovIdNumber")}
                    placeholder="Enter ID number"
                  />
                </div>
                <div>
                  <Label htmlFor="spouseGovIdExpiration">ID Expiration</Label>
                  <Input
                    id="spouseGovIdExpiration"
                    type="date"
                    {...form.register("spouseGovIdExpiration")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spouseCellPhone">Cell Phone</Label>
                  <Input
                    id="spouseCellPhone"
                    {...form.register("spouseCellPhone")}
                    placeholder="Enter cell phone"
                  />
                </div>
                <div>
                  <Label htmlFor="spouseWorkPhone">Work Phone</Label>
                  <Input
                    id="spouseWorkPhone"
                    {...form.register("spouseWorkPhone")}
                    placeholder="Enter work phone"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spousePersonalEmail">Personal Email</Label>
                  <Input
                    id="spousePersonalEmail"
                    type="email"
                    {...form.register("spousePersonalEmail")}
                    placeholder="Enter personal email"
                  />
                </div>
                <div>
                  <Label htmlFor="spouseWorkEmail">Work Email</Label>
                  <Input
                    id="spouseWorkEmail"
                    type="email"
                    {...form.register("spouseWorkEmail")}
                    placeholder="Enter work email"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="spousePreferredContactMethod">Preferred Contact Method</Label>
                  <Select value={form.watch("spousePreferredContactMethod")} onValueChange={(value) => form.setValue("spousePreferredContactMethod", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preferred method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cell">Cell Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="work_phone">Work Phone</SelectItem>
                      <SelectItem value="personal_email">Personal Email</SelectItem>
                      <SelectItem value="work_email">Work Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="marriageDate">Marriage Date</Label>
                  <Input
                    id="marriageDate"
                    type="date"
                    {...form.register("marriageDate")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Mailing and home addresses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-semibold">Mailing Address</h4>
                <div>
                  <Label htmlFor="mailingAddressStreet1">Street Address</Label>
                  <Input
                    id="mailingAddressStreet1"
                    {...form.register("mailingAddressStreet1")}
                    placeholder="Enter street address"
                  />
                </div>
                <div>
                  <Label htmlFor="mailingAddressStreet2">Street Address 2</Label>
                  <Input
                    id="mailingAddressStreet2"
                    {...form.register("mailingAddressStreet2")}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="mailingAddressCity">City</Label>
                    <Input
                      id="mailingAddressCity"
                      {...form.register("mailingAddressCity")}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mailingAddressState">State</Label>
                    <Input
                      id="mailingAddressState"
                      {...form.register("mailingAddressState")}
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mailingAddressZip">ZIP Code</Label>
                    <Input
                      id="mailingAddressZip"
                      {...form.register("mailingAddressZip")}
                      placeholder="Enter ZIP code"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Home Address</h4>
                  <div className="flex items-center space-x-4">
                    <Label htmlFor="sameAsMailingAddress" className="text-sm font-medium">
                      Same as Mailing Address
                    </Label>
                    <RadioGroup 
                      value={sameAsMailingAddress ? "yes" : "no"}
                      onValueChange={handleSameAsMailingAddress}
                      className="flex items-center space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="same-yes" />
                        <Label htmlFor="same-yes" className="text-sm">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="same-no" />
                        <Label htmlFor="same-no" className="text-sm">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <div>
                  <Label htmlFor="homeAddressStreet1">Street Address</Label>
                  <Input
                    id="homeAddressStreet1"
                    {...form.register("homeAddressStreet1")}
                    placeholder="Enter street address"
                    disabled={sameAsMailingAddress}
                  />
                </div>
                <div>
                  <Label htmlFor="homeAddressStreet2">Street Address 2</Label>
                  <Input
                    id="homeAddressStreet2"
                    {...form.register("homeAddressStreet2")}
                    placeholder="Apartment, suite, etc."
                    disabled={sameAsMailingAddress}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="homeAddressCity">City</Label>
                    <Input
                      id="homeAddressCity"
                      {...form.register("homeAddressCity")}
                      placeholder="Enter city"
                      disabled={sameAsMailingAddress}
                    />
                  </div>
                  <div>
                    <Label htmlFor="homeAddressState">State</Label>
                    <Input
                      id="homeAddressState"
                      {...form.register("homeAddressState")}
                      placeholder="Enter state"
                      disabled={sameAsMailingAddress}
                    />
                  </div>
                  <div>
                    <Label htmlFor="homeAddressZip">ZIP Code</Label>
                    <Input
                      id="homeAddressZip"
                      {...form.register("homeAddressZip")}
                      placeholder="Enter ZIP code"
                      disabled={sameAsMailingAddress}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold">Vacation Home Address</h4>
                <div>
                  <Label htmlFor="vacationAddressStreet1">Street Address</Label>
                  <Input
                    id="vacationAddressStreet1"
                    {...form.register("vacationAddressStreet1")}
                    placeholder="Enter street address"
                  />
                </div>
                <div>
                  <Label htmlFor="vacationAddressStreet2">Street Address 2</Label>
                  <Input
                    id="vacationAddressStreet2"
                    {...form.register("vacationAddressStreet2")}
                    placeholder="Apartment, suite, etc."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="vacationAddressCity">City</Label>
                    <Input
                      id="vacationAddressCity"
                      {...form.register("vacationAddressCity")}
                      placeholder="Enter city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vacationAddressState">State</Label>
                    <Input
                      id="vacationAddressState"
                      {...form.register("vacationAddressState")}
                      placeholder="Enter state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="vacationAddressZip">ZIP Code</Label>
                    <Input
                      id="vacationAddressZip"
                      {...form.register("vacationAddressZip")}
                      placeholder="Enter ZIP code"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="children" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Children Information</CardTitle>
              <CardDescription>Details about the client's children</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[1, 2, 3, 4, 5, 6, 7].map((childNum) => (
                <div key={childNum} className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold">Child {childNum}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`child${childNum}FirstName`}>First Name</Label>
                      <Input
                        id={`child${childNum}FirstName`}
                        {...form.register(`child${childNum}FirstName` as keyof InsertContact)}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`child${childNum}LastName`}>Last Name</Label>
                      <Input
                        id={`child${childNum}LastName`}
                        {...form.register(`child${childNum}LastName` as keyof InsertContact)}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`child${childNum}Gender`}>Gender</Label>
                      <Select value={form.watch(`child${childNum}Gender` as keyof InsertContact)} onValueChange={(value) => form.setValue(`child${childNum}Gender` as keyof InsertContact, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`child${childNum}DateOfBirth`}>Date of Birth</Label>
                      <Input
                        id={`child${childNum}DateOfBirth`}
                        type="date"
                        {...form.register(`child${childNum}DateOfBirth` as keyof InsertContact)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`child${childNum}DateOfDeath`}>Date of Death</Label>
                      <Input
                        id={`child${childNum}DateOfDeath`}
                        type="date"
                        {...form.register(`child${childNum}DateOfDeath` as keyof InsertContact)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professionals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Professional Contacts</CardTitle>
              <CardDescription>Related professionals and service providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: "investment", label: "Investment Advisor" },
                { key: "tax", label: "Tax Professional" },
                { key: "estateAtty", label: "Estate Attorney" },
                { key: "pnc", label: "Property & Casualty Insurance" },
              ].map((professional) => (
                <div key={professional.key} className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-semibold">{professional.label}</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`${professional.key}Name`}>Name</Label>
                      <Input
                        id={`${professional.key}Name`}
                        {...form.register(`${professional.key}Name` as keyof InsertContact)}
                        placeholder="Enter name"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${professional.key}Email`}>Email</Label>
                      <Input
                        id={`${professional.key}Email`}
                        type="email"
                        {...form.register(`${professional.key}Email` as keyof InsertContact)}
                        placeholder="Enter email"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`${professional.key}Phone`}>Phone</Label>
                      <Input
                        id={`${professional.key}Phone`}
                        {...form.register(`${professional.key}Phone` as keyof InsertContact)}
                        placeholder="Enter phone"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="space-y-4">
        <Button 
          type="submit" 
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? 
            (contact ? "Updating..." : "Creating...") : 
            (contact ? "Update Contact" : "Create Contact")
          }
        </Button>
      </div>
    </form>
  );
}