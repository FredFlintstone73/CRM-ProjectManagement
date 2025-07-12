import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { insertContactSchema, type InsertContact } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ContactFormProps {
  onSuccess?: () => void;
}

export default function ContactForm({ onSuccess }: ContactFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sameAsMailingAddress, setSameAsMailingAddress] = useState(false);

  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      contactType: "client",
      status: "active",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      await apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: () => {
      toast({
        title: "Contact created",
        description: "The contact has been successfully created.",
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
        description: "Failed to create contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertContact) => {
    setIsSubmitting(true);
    mutation.mutate(data);
    setIsSubmitting(false);
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

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                      <SelectItem value="follow_up">Follow Up</SelectItem>
                      <SelectItem value="converted">Converted</SelectItem>
                    </SelectContent>
                  </Select>
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
                { key: "lifeIns", label: "Life Insurance Agent" },
                { key: "other", label: "Other Professional" },
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
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...form.register("notes")}
            placeholder="Enter any additional notes"
            rows={3}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting || mutation.isPending}
          className="w-full"
        >
          {isSubmitting || mutation.isPending ? "Creating..." : "Create Contact"}
        </Button>
      </div>
    </form>
  );
}