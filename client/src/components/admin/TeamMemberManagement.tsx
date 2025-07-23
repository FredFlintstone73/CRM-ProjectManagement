import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Settings, UserCheck, UserX, User } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accessLevel: "administrator" | "manager" | "team_member";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TeamMemberManagement() {
  const { toast } = useToast();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showChangeAccessDialog, setShowChangeAccessDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newAccessLevel, setNewAccessLevel] = useState<string>("");
  const [newStatus, setNewStatus] = useState<boolean>(true);

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const changeAccessLevelMutation = useMutation({
    mutationFn: async ({ userId, accessLevel }: { userId: string; accessLevel: string }) => {
      const response = await fetch(`/api/users/${userId}/access-level`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ accessLevel }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Access Level Updated",
        description: "Team member's access level has been successfully updated.",
      });
      setShowChangeAccessDialog(false);
      setSelectedMember(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: `Failed to update access level: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Status Updated",
        description: `Team member has been ${newStatus ? 'activated' : 'deactivated'} successfully.`,
      });
      setShowStatusDialog(false);
      setSelectedMember(null);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

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

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <UserCheck className="w-3 h-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <UserX className="w-3 h-3 mr-1" />
        Inactive
      </Badge>
    );
  };

  const handleChangeAccessLevel = (member: TeamMember) => {
    setSelectedMember(member);
    setNewAccessLevel(member.accessLevel);
    setShowChangeAccessDialog(true);
  };

  const handleChangeStatus = (member: TeamMember, newActiveStatus: boolean) => {
    setSelectedMember(member);
    setNewStatus(newActiveStatus);
    setShowStatusDialog(true);
  };

  const confirmAccessLevelChange = () => {
    if (selectedMember && newAccessLevel) {
      changeAccessLevelMutation.mutate({
        userId: selectedMember.id,
        accessLevel: newAccessLevel,
      });
    }
  };

  const confirmStatusChange = () => {
    if (selectedMember) {
      changeStatusMutation.mutate({
        userId: selectedMember.id,
        isActive: newStatus,
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : !teamMembers || (Array.isArray(teamMembers) && teamMembers.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No team members found</p>
              <p className="text-sm">Send invitations to add team members.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(teamMembers) && teamMembers.map((member: TeamMember) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div>
                        <p className="font-medium">
                          {member.firstName && member.lastName
                            ? `${member.firstName} ${member.lastName}`
                            : "Unnamed User"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                      {getAccessLevelBadge(member.accessLevel)}
                      {getStatusBadge(member.isActive)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Joined: {new Date(member.createdAt).toLocaleDateString()}
                      </span>
                      <span>
                        Updated: {new Date(member.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleChangeAccessLevel(member)}
                    >
                      <Settings className="mr-1 h-3 w-3" />
                      Change Access
                    </Button>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {member.isActive ? "Active" : "Inactive"}
                      </span>
                      <Switch
                        checked={member.isActive}
                        onCheckedChange={(checked) => handleChangeStatus(member, checked)}
                        disabled={changeStatusMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Access Level Dialog */}
      <Dialog open={showChangeAccessDialog} onOpenChange={setShowChangeAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Access Level</DialogTitle>
            <DialogDescription>
              Update the access level for {selectedMember?.firstName} {selectedMember?.lastName}.
              This will change their permissions in the system.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select value={newAccessLevel} onValueChange={setNewAccessLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="administrator">Administrator - Full Access</SelectItem>
                <SelectItem value="manager">Manager - Manage All Except Users</SelectItem>
                <SelectItem value="team_member">Team Member - Limited Access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowChangeAccessDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmAccessLevelChange}
              disabled={changeAccessLevelMutation.isPending || !newAccessLevel}
            >
              {changeAccessLevelMutation.isPending ? "Updating..." : "Update Access Level"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{newStatus ? "Activate" : "Deactivate"} Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to {newStatus ? "activate" : "deactivate"} {selectedMember?.firstName} {selectedMember?.lastName}?
              {!newStatus && " This will prevent them from accessing the system."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowStatusDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmStatusChange}
              disabled={changeStatusMutation.isPending}
              variant={newStatus ? "default" : "destructive"}
            >
              {changeStatusMutation.isPending ? "Updating..." : (newStatus ? "Activate" : "Deactivate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}