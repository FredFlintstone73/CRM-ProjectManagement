import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useToast } from "@/hooks/use-toast";
import UserInvitationDialog from "@/components/admin/UserInvitationDialog";
import EmailConfigurationStatus from "@/components/admin/EmailConfigurationStatus";
import TeamMemberManagement from "@/components/admin/TeamMemberManagement";
import InvitationRequestsSection from "@/components/admin/InvitationRequestsSection";
import { Users, Mail, Clock, CheckCircle, XCircle, AlertTriangle, Copy, Trash2, Send } from "lucide-react";
import { formatAccessLevel } from "@/lib/utils/formatAccessLevel";

interface UserInvitation {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  accessLevel: string;
  invitationCode: string;
  status: "pending" | "accepted" | "expired";
  invitedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
}

export default function UserManagement() {
  const { isAdministrator, isLoading: accessLoading } = useAccessControl();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invitations, isLoading, error } = useQuery<UserInvitation[]>({
    queryKey: ['/api/user-invitations'],
    enabled: isAdministrator,
    retry: 3,
    retryDelay: 1000,
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await fetch(`/api/user-invitations/${invitationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete invitation: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user-invitations'] });
      toast({
        title: "Invitation deleted",
        description: "Team invitation has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete invitation",
        description: error.message || "There was an error deleting the invitation",
        variant: "destructive",
      });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await fetch(`/api/user-invitations/${invitationId}/resend`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to resend invitation: ${errorText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation resent",
        description: "Invitation email has been sent again successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to resend invitation",
        description: error.message || "There was an error resending the invitation",
        variant: "destructive",
      });
    },
  });

  // Redirect non-administrators
  useEffect(() => {
    if (!accessLoading && !isAdministrator) {
      toast({
        title: "Access Denied",
        description: "You need administrator access to view this page.",
        variant: "destructive",
      });
      // In a real app, redirect to home page here
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
  }, [isAdministrator, accessLoading, toast]);

  if (accessLoading || !isAdministrator) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's a fetch error
  if (error) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage team member invitations and access levels
            </p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-medium">Failed to load user management data</h3>
          </div>
          <p className="text-red-700 mt-2 text-sm">
            Error: {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4" />;
      case "expired":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary" as const;
      case "accepted":
        return "default" as const;
      case "expired":
        return "destructive" as const;
      default:
        return "outline" as const;
    }
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
        return <Badge variant="outline">{formatAccessLevel(accessLevel)}</Badge>;
    }
  };

  const copyInvitationCode = async (invitationCode: string) => {
    try {
      await navigator.clipboard.writeText(invitationCode);
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
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage team member invitations and access levels
          </p>
        </div>
        <UserInvitationDialog />
      </div>
      <div className="grid gap-6">
        {/* Email Configuration Status */}
        <EmailConfigurationStatus />
        
        {/* Team Members Management */}
        <TeamMemberManagement />

        {/* Invitations Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : !invitations || invitations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No invitations sent</p>
                <p className="text-sm">Send your first team member invitation to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invitations.map((invitation: UserInvitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border rounded-lg pt-[0px] pb-[0px] pl-[5px] pr-[5px]"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <p className="font-medium">
                            {invitation.firstName && invitation.lastName
                              ? `${invitation.firstName} ${invitation.lastName}`
                              : "Unnamed User"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {invitation.email}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getAccessLevelBadge(invitation.accessLevel)}
                          <Badge
                            variant={getStatusVariant(invitation.status)}
                            className="flex items-center gap-1"
                          >
                            {getStatusIcon(invitation.status)}
                            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Invited: {format(new Date(invitation.invitedAt), "MMM d, yyyy")}
                        </span>
                        <span>
                          Expires: {format(new Date(invitation.expiresAt), "MMM d, yyyy")}
                        </span>
                        {invitation.acceptedAt && (
                          <span>
                            Accepted: {format(new Date(invitation.acceptedAt), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>
                      
                      {invitation.status === "pending" && invitation.invitationCode && (
                        <div className="p-2 bg-muted/50 rounded border mt-[5px] mb-[5px] pt-[0px] pb-[0px]">
                          <div className="text-xs text-muted-foreground mb-1">Invitation Code:</div>
                          <code className="text-sm font-mono">{invitation.invitationCode}</code>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {invitation.status === "pending" && invitation.invitationCode && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => copyInvitationCode(invitation.invitationCode)}
                              className="pl-[5px] pr-[5px]"
                            >
                              <Copy className="mr-1 h-3 w-3" />
                              Copy Code
                            </Button>
                            
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => resendInvitationMutation.mutate(invitation.id)}
                              disabled={resendInvitationMutation.isPending}
                              className="pl-[5px] pr-[5px]"
                            >
                              <Send className="mr-1 h-3 w-3" />
                              Resend Invitation
                            </Button>
                          </>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                          disabled={deleteInvitationMutation.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 pl-[5px] pr-[5px]"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitation Requests */}
        <InvitationRequestsSection />
      </div>
    </div>
  );
}