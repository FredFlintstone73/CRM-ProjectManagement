import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useToast } from "@/hooks/use-toast";
import UserInvitationDialog from "@/components/admin/UserInvitationDialog";
import { Users, Mail, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

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

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['/api/user-invitations'],
    enabled: isAdministrator,
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
        return <Badge variant="outline">{accessLevel}</Badge>;
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
                    className="flex items-center justify-between p-4 border rounded-lg"
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
                        {getAccessLevelBadge(invitation.accessLevel)}
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
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={getStatusVariant(invitation.status)}
                        className="flex items-center gap-1"
                      >
                        {getStatusIcon(invitation.status)}
                        {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                      </Badge>
                      
                      {invitation.status === "pending" && (
                        <Button variant="outline" size="sm">
                          Copy Link
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}