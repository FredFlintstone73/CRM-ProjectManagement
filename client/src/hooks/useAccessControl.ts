import { useQuery } from "@tanstack/react-query";

export type AccessLevel = "team_member" | "manager" | "administrator";

export interface AccessPermissions {
  canViewTemplates: boolean;
  canEditTemplates: boolean;
  canDeleteTemplates: boolean;
  canEditContacts: boolean;
  canDeleteContacts: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canInviteUsers: boolean;
  canManageUsers: boolean;
  canViewAllTasks: boolean;
  canEditTaskAssignments: boolean;
}

export function useAccessControl() {
  const { data: accessLevelData, isLoading } = useQuery({
    queryKey: ['/api/auth/access-level'],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
  });

  const accessLevel: AccessLevel = (accessLevelData as any)?.accessLevel || "team_member";

  const permissions: AccessPermissions = {
    // Administrator permissions (full access)
    canViewTemplates: accessLevel !== "team_member",
    canEditTemplates: accessLevel === "administrator" || accessLevel === "manager", 
    canDeleteTemplates: accessLevel === "administrator" || accessLevel === "manager",
    canEditContacts: true, // All users can edit contacts
    canDeleteContacts: accessLevel === "administrator",
    canEditProjects: accessLevel === "administrator" || accessLevel === "manager",
    canDeleteProjects: accessLevel === "administrator" || accessLevel === "manager", 
    canEditTasks: true, // All users can edit tasks
    canDeleteTasks: accessLevel === "administrator" || accessLevel === "manager",
    canInviteUsers: accessLevel === "administrator",
    canManageUsers: accessLevel === "administrator",
    canViewAllTasks: true, // All users can view all tasks
    canEditTaskAssignments: accessLevel === "administrator" || accessLevel === "manager",
  };

  const isAdministrator = accessLevel === "administrator";
  const isManager = accessLevel === "manager";
  const isTeamMember = accessLevel === "team_member";

  return {
    accessLevel,
    permissions,
    isAdministrator,
    isManager, 
    isTeamMember,
    isLoading,
  };
}