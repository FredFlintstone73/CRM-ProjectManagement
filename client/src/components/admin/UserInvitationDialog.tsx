import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, UserPlus } from "lucide-react";

const invitationFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  accessLevel: z.enum(["team_member", "manager", "administrator"]),
});

type InvitationForm = z.infer<typeof invitationFormSchema>;

interface InvitationResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  invitationCode: string;
  emailSent: boolean;
  expiresAt: string;
}

interface UserInvitationDialogProps {
  trigger?: React.ReactNode;
}

export default function UserInvitationDialog({ trigger }: UserInvitationDialogProps) {
  const [open, setOpen] = useState(false);
  const [createdInvitation, setCreatedInvitation] = useState<InvitationResponse | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log("UserInvitationDialog render, open:", open);

  const form = useForm<InvitationForm>({
    resolver: zodResolver(invitationFormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      accessLevel: "team_member",
    },
  });

  const inviteMutation = useMutation<InvitationResponse, Error, InvitationForm>({
    mutationFn: async (data: InvitationForm): Promise<InvitationResponse> => {
      const response = await fetch("/api/user-invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Invitation error:", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: (invitation) => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-invitations'] });
      setCreatedInvitation(invitation);
      
      if (invitation.emailSent) {
        toast({
          title: "Invitation sent",
          description: `Email invitation sent to ${invitation.email}`,
        });
        form.reset();
        setOpen(false);
        setCreatedInvitation(null);
      } else {
        toast({
          title: "Invitation created",
          description: `Invitation code ready to share with ${invitation.firstName} ${invitation.lastName}`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invitation",
        description: error.message || "There was an error sending the invitation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvitationForm) => {
    inviteMutation.mutate(data);
  };

  const copyInvitationCode = async () => {
    if (createdInvitation) {
      try {
        await navigator.clipboard.writeText(createdInvitation.invitationCode);
        toast({
          title: "Copied!",
          description: "Invitation code copied to clipboard",
        });
      } catch (err) {
        toast({
          title: "Copy failed",
          description: "Please manually copy the invitation code",
          variant: "destructive",
        });
      }
    }
  };

  const handleDialogClose = () => {
    console.log("Dialog closing");
    setOpen(false);
    setCreatedInvitation(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button onClick={() => {
            console.log("Invite User button clicked");
            setOpen(true);
          }}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {createdInvitation ? "Invitation Created" : "Invite New Team Member"}
          </DialogTitle>
        </DialogHeader>
        
        {createdInvitation ? (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Invitation Code</h4>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-background border rounded font-mono text-sm">
                  {createdInvitation.invitationCode}
                </code>
                <Button onClick={copyInvitationCode} size="sm" variant="outline">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Share this code with {createdInvitation.firstName} {createdInvitation.lastName} at {createdInvitation.email}
              </p>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button onClick={handleDialogClose}>Done</Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="accessLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select access level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="team_member">Team Member</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="administrator">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Creating..." : "Create Invitation"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}