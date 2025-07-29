import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertTriangle, UserCheck, Clock, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

const invitationCodeSchema = z.object({
  code: z.string().min(1, "Invitation code is required"),
});

type InvitationCodeForm = z.infer<typeof invitationCodeSchema>;

interface Invitation {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  accessLevel: string;
  invitationCode: string;
  status: string;
  expiresAt: string;
  invitedBy: string;
}

export default function AcceptInvitation() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [invitationCode, setInvitationCode] = useState<string>("");
  const [showCodeInput, setShowCodeInput] = useState(true);

  const form = useForm<InvitationCodeForm>({
    resolver: zodResolver(invitationCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  // Check URL for invitation code
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
      setInvitationCode(codeFromUrl);
      setShowCodeInput(false);
      form.setValue('code', codeFromUrl);
    }
  }, [form]);

  // Fetch invitation details
  const { data: invitation, isLoading: invitationLoading, error: invitationError } = useQuery<Invitation>({
    queryKey: ['/api/user-invitations', invitationCode],
    queryFn: async () => {
      const response = await fetch(`/api/user-invitations/${invitationCode}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!invitationCode,
    retry: false,
  });

  // Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user-invitations/${invitationCode}/accept`, {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to ClientHub!",
        description: "Your invitation has been accepted successfully. You now have access to the system.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message || "There was an error accepting your invitation",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvitationCodeForm) => {
    const trimmedCode = data.code.trim();
    setInvitationCode(trimmedCode);
    setShowCodeInput(false);
  };

  const handleAcceptInvitation = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to accept your invitation.",
        variant: "destructive",
      });
      // Preserve invitation code through login process
      const redirectUrl = encodeURIComponent(`/accept-invitation?code=${invitationCode}`);
      setLocation(`/api/login?redirect=${redirectUrl}`);
      return;
    }
    acceptMutation.mutate();
  };

  const getAccessLevelBadge = (accessLevel: string) => {
    switch (accessLevel) {
      case "administrator":
        return <Badge variant="destructive">Administrator</Badge>;
      case "manager":
        return <Badge variant="default">Manager</Badge>;
      case "team_member":
        return <Badge variant="secondary">Team Member</Badge>;
      default:
        return <Badge variant="outline">{accessLevel}</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with back link */}
      <div className="p-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/")}
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to ClientHub
        </Button>
      </div>
      
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Join the Team</CardTitle>
              <p className="text-muted-foreground">
                Welcome to ClientHub! Enter your invitation code to get started.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
            {showCodeInput ? (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="code" className="text-sm font-medium">
                    Invitation Code
                  </label>
                  <Input
                    id="code"
                    placeholder="INV-ABC123"
                    {...form.register("code")}
                    className="mt-1"
                  />
                  {form.formState.errors.code && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Verify Invitation
                </Button>
              </form>
            ) : invitationLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Verifying invitation...</p>
              </div>
            ) : invitationError ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Invalid Invitation</h3>
                <p className="text-muted-foreground mb-4">
                  {invitationError instanceof Error && invitationError.message.includes('404') 
                    ? "This invitation code does not exist. Please check the code and try again."
                    : invitationError instanceof Error && invitationError.message.includes('410')
                    ? "This invitation has expired. Please request a new invitation."
                    : invitationError instanceof Error && invitationError.message.includes('400')
                    ? "This invitation has already been used. Please request a new invitation if needed."
                    : "This invitation code is not valid or has expired."
                  }
                </p>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Make sure to copy the entire invitation code without any extra spaces.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCodeInput(true);
                      setInvitationCode("");
                      form.reset();
                    }}
                  >
                    Try Another Code
                  </Button>
                </div>
              </div>
            ) : invitation ? (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Valid Invitation</h3>
                  <p className="text-muted-foreground">
                    You've been invited to join ClientHub
                  </p>
                </div>

                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="font-medium">
                      {invitation.firstName} {invitation.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="font-medium">{invitation.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Access Level:</span>
                    {getAccessLevelBadge(invitation.accessLevel)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Expires:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                    </span>
                  </div>
                </div>

                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      Please log in to accept your invitation
                    </p>
                    <Button 
                      onClick={() => {
                        const redirectUrl = encodeURIComponent(`/accept-invitation?code=${invitationCode}`);
                        setLocation(`/api/login?redirect=${redirectUrl}`);
                      }} 
                      className="w-full"
                    >
                      Log In to Accept
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleAcceptInvitation}
                    disabled={acceptMutation.isPending}
                    className="w-full"
                  >
                    {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
                  </Button>
                )}

                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setShowCodeInput(true);
                      setInvitationCode("");
                      form.reset();
                    }}
                  >
                    Use Different Code
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}