import { useEffect } from "react";
import { useAccessControl, type AccessLevel } from "@/hooks/useAccessControl";
import { useToast } from "@/hooks/use-toast";

interface AccessControlWrapperProps {
  children: React.ReactNode;
  requiredLevel?: AccessLevel;
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
  redirectToHome?: boolean;
}

export default function AccessControlWrapper({
  children,
  requiredLevel,
  requiredPermissions = [],
  fallback,
  redirectToHome = true,
}: AccessControlWrapperProps) {
  const { accessLevel, permissions, isLoading } = useAccessControl();
  const { toast } = useToast();

  const hasRequiredLevel = () => {
    if (!requiredLevel) return true;
    
    const levels: AccessLevel[] = ["team_member", "manager", "administrator"];
    const userLevelIndex = levels.indexOf(accessLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);
    
    return userLevelIndex >= requiredLevelIndex;
  };

  const hasRequiredPermissions = () => {
    if (requiredPermissions.length === 0) return true;
    
    return requiredPermissions.every(permission => 
      permissions[permission as keyof typeof permissions]
    );
  };

  const hasAccess = hasRequiredLevel() && hasRequiredPermissions();

  useEffect(() => {
    if (!isLoading && !hasAccess && redirectToHome) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this resource.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    }
  }, [isLoading, hasAccess, redirectToHome, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access this resource.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}