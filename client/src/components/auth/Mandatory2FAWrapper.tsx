import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import TwoFactorAuth from "./two-factor-auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

interface Mandatory2FAWrapperProps {
  children: React.ReactNode;
}

export function Mandatory2FAWrapper({ children }: Mandatory2FAWrapperProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [needs2FA, setNeeds2FA] = useState(false);
  const [is2FADialogOpen, setIs2FADialogOpen] = useState(false);
  const [checking2FA, setChecking2FA] = useState(true);

  useEffect(() => {
    const check2FAStatus = async () => {
      if (!isAuthenticated || !user || isLoading) {
        setChecking2FA(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/2fa/status', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          const requires2FA = !data.enabled;
          setNeeds2FA(requires2FA);
          setIs2FADialogOpen(requires2FA);
        }
      } catch (error) {
        console.error('Error checking 2FA status:', error);
      } finally {
        setChecking2FA(false);
      }
    };

    check2FAStatus();
  }, [isAuthenticated, user, isLoading]);

  const handle2FAComplete = (success: boolean) => {
    if (success) {
      setNeeds2FA(false);
      setIs2FADialogOpen(false);
      // Refresh the page to reload with 2FA enabled
      window.location.reload();
    }
  };

  // Show loading while checking authentication or 2FA status
  if (isLoading || checking2FA) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking security settings...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show children (will redirect to login)
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // If 2FA is required but not set up, show mandatory setup
  if (needs2FA && is2FADialogOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <Shield className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Two-factor authentication is required for all team members. Please set up 2FA to continue using the system.
            </AlertDescription>
          </Alert>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
              Security Setup Required
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              Complete your two-factor authentication setup to access ClientHub.
            </p>
            
            <TwoFactorAuth
              isSetup={true}
              onComplete={handle2FAComplete}
            />
          </div>
        </div>
      </div>
    );
  }

  // If 2FA is set up or not required, show normal app
  return <>{children}</>;
}