import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Building2, Edit, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertContactBusinessSchema, type ContactBusiness } from "@shared/schema";
import { z } from "zod";

interface ContactBusinessesProps {
  contactId: number;
}

type ContactBusinessFormData = z.infer<typeof insertContactBusinessSchema>;

export default function ContactBusinesses({ contactId }: ContactBusinessesProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<ContactBusiness | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [businessToDelete, setBusinessToDelete] = useState<ContactBusiness | null>(null);

  const form = useForm<ContactBusinessFormData>({
    resolver: zodResolver(insertContactBusinessSchema),
    defaultValues: {
      contactId,
      businessName: "",
      businessAddressStreet1: "",
      businessAddressStreet2: "",
      businessAddressCity: "",
      businessAddressState: "",
      businessAddressZip: "",
      businessPhone: "",
      officeManagerName: "",
      businessEin: "",
      partnershipDetails: "",
      sortOrder: 1,
    },
  });

  const { data: businesses = [], isLoading } = useQuery<ContactBusiness[]>({
    queryKey: [`/api/contacts/${contactId}/businesses`],
    enabled: isAuthenticated,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });

  // Memoize sorted businesses for performance
  const sortedBusinesses = useMemo(() => {
    return businesses.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [businesses]);

  const createBusinessMutation = useMutation({
    mutationFn: async (data: ContactBusinessFormData) => {
      return await apiRequest('POST', `/api/contacts/${contactId}/businesses`, data);
    },
    onSuccess: () => {
      // Use requestIdleCallback for better performance
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/businesses`] });
        });
      } else {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/businesses`] });
        }, 100);
      }
      setIsDialogOpen(false);
      setEditingBusiness(null);
      form.reset();
      toast({
        title: "Success",
        description: "Business information saved successfully.",
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
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save business information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBusinessMutation = useMutation({
    mutationFn: async (data: ContactBusinessFormData & { id: number }) => {
      return await apiRequest('PUT', `/api/contacts/${contactId}/businesses/${data.id}`, data);
    },
    onSuccess: () => {
      // Use requestIdleCallback for better performance
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/businesses`] });
        });
      } else {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/businesses`] });
        }, 100);
      }
      setIsDialogOpen(false);
      setEditingBusiness(null);
      form.reset();
      toast({
        title: "Success",
        description: "Business information updated successfully.",
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
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update business information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBusinessMutation = useMutation({
    mutationFn: async (businessId: number) => {
      await apiRequest('DELETE', `/api/contacts/${contactId}/businesses/${businessId}`);
    },
    onSuccess: () => {
      // Use requestIdleCallback for better performance
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/businesses`] });
        });
      } else {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contactId}/businesses`] });
        }, 100);
      }
      setDeleteDialogOpen(false);
      setBusinessToDelete(null);
      toast({
        title: "Success",
        description: "Business information deleted successfully.",
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
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete business information. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddBusiness = () => {
    if (sortedBusinesses.length >= 6) {
      toast({
        title: "Limit Reached",
        description: "You can only add up to 6 businesses per contact.",
        variant: "destructive",
      });
      return;
    }
    
    form.reset({
      contactId,
      businessName: "",
      businessAddressStreet1: "",
      businessAddressStreet2: "",
      businessAddressCity: "",
      businessAddressState: "",
      businessAddressZip: "",
      businessPhone: "",
      officeManagerName: "",
      businessEin: "",
      partnershipDetails: "",
      sortOrder: sortedBusinesses.length + 1,
    });
    setEditingBusiness(null);
    setIsDialogOpen(true);
  };

  const handleEditBusiness = (business: ContactBusiness) => {
    form.reset({
      contactId: business.contactId,
      businessName: business.businessName || "",
      businessAddressStreet1: business.businessAddressStreet1 || "",
      businessAddressStreet2: business.businessAddressStreet2 || "",
      businessAddressCity: business.businessAddressCity || "",
      businessAddressState: business.businessAddressState || "",
      businessAddressZip: business.businessAddressZip || "",
      businessPhone: business.businessPhone || "",
      officeManagerName: business.officeManagerName || "",
      businessEin: business.businessEin || "",
      partnershipDetails: business.partnershipDetails || "",
      sortOrder: business.sortOrder || 1,
    });
    setEditingBusiness(business);
    setIsDialogOpen(true);
  };

  const handleDeleteBusiness = (business: ContactBusiness) => {
    setBusinessToDelete(business);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (businessToDelete) {
      deleteBusinessMutation.mutate(businessToDelete.id);
    }
  };

  const onSubmit = (data: ContactBusinessFormData) => {
    if (editingBusiness) {
      updateBusinessMutation.mutate({ ...data, id: editingBusiness.id });
    } else {
      createBusinessMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Business Information</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddBusiness} disabled={sortedBusinesses.length >= 6}>
              <Plus className="w-4 h-4 mr-2" />
              Add Business {sortedBusinesses.length < 6 && `(${sortedBusinesses.length}/6)`}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBusiness ? "Edit Business Information" : "Add Business Information"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter business name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddressStreet1"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Business Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Street address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddressStreet2"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input placeholder="Apartment, suite, etc. (optional)" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddressCity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddressState"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="State" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddressZip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="ZIP code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="Business phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="officeManagerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Manager Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Office manager name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessEin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business EIN</FormLabel>
                        <FormControl>
                          <Input placeholder="Business EIN number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="partnershipDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Partnership Details</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter partnership details and notes..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createBusinessMutation.isPending || updateBusinessMutation.isPending}
                  >
                    {createBusinessMutation.isPending || updateBusinessMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      editingBusiness ? "Update Business" : "Add Business"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {sortedBusinesses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Building2 className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No business information added yet</p>
            <Button onClick={handleAddBusiness}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Business
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedBusinesses.map((business, index) => (
              <Card key={business.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center">
                      <Building2 className="w-4 h-4 mr-2" />
                      Business {index + 1}
                    </CardTitle>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditBusiness(business)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBusiness(business)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {business.businessName && (
                    <div>
                      <Label className="text-xs text-gray-500">Business Name</Label>
                      <p className="text-sm font-medium">{business.businessName}</p>
                    </div>
                  )}
                  
                  {(business.businessAddressStreet1 || business.businessAddressCity) && (
                    <div>
                      <Label className="text-xs text-gray-500">Address</Label>
                      <div className="text-sm">
                        {business.businessAddressStreet1 && <div>{business.businessAddressStreet1}</div>}
                        {business.businessAddressStreet2 && <div>{business.businessAddressStreet2}</div>}
                        {(business.businessAddressCity || business.businessAddressState || business.businessAddressZip) && (
                          <div>
                            {business.businessAddressCity}
                            {business.businessAddressState && `, ${business.businessAddressState}`}
                            {business.businessAddressZip && ` ${business.businessAddressZip}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {business.businessPhone && (
                    <div>
                      <Label className="text-xs text-gray-500">Phone</Label>
                      <p className="text-sm">{business.businessPhone}</p>
                    </div>
                  )}
                  
                  {business.officeManagerName && (
                    <div>
                      <Label className="text-xs text-gray-500">Office Manager</Label>
                      <p className="text-sm">{business.officeManagerName}</p>
                    </div>
                  )}
                  
                  {business.businessEin && (
                    <div>
                      <Label className="text-xs text-gray-500">EIN</Label>
                      <p className="text-sm">{business.businessEin}</p>
                    </div>
                  )}
                  
                  {business.partnershipDetails && (
                    <div>
                      <Label className="text-xs text-gray-500">Partnership Details</Label>
                      <p className="text-sm">{business.partnershipDetails}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business Information</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this business information? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteBusinessMutation.isPending}
            >
              {deleteBusinessMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}