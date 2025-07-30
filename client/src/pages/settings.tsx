import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Shield, Smartphone, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import NavigationCustomizer from "@/components/settings/navigation-customizer";
import { UserEmailConfig } from "@/components/email/user-email-config";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useEffect } from "react";

export default function Settings() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const { toast } = useToast();
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: twoFactorStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['/api/auth/2fa/status'],
    enabled: isAuthenticated,
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const disableTwoFactorMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/2fa/disable', 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
        variant: "default",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
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
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTwoFactorToggle = (enabled: boolean) => {
    if (enabled) {
      setShowTwoFactorSetup(true);
    } else {
      disableTwoFactorMutation.mutate();
    }
  };

  const handleTwoFactorComplete = (success: boolean) => {
    if (success) {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
    }
    setShowTwoFactorSetup(false);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (showTwoFactorSetup) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setShowTwoFactorSetup(false)}
          >
            ← Back to Settings
          </Button>
        </div>
        <TwoFactorSetup />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account preferences and security</p>
        </div>
      </div>
      {/* Account Information */}
      <Card>
        <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[5px] pb-[5px]">
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Name</Label>
              <p className="text-sm text-muted-foreground">
                {user?.firstName || ''} {user?.lastName || ''}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium">Access Level</Label>
            <p className="text-sm text-muted-foreground capitalize">
              {user?.accessLevel?.replace('_', ' ') || ''}
            </p>
          </div>
        </CardContent>
      </Card>
      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6 pt-[0px] pb-[0px]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label>Two-Factor Authentication (Required)</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Two-factor authentication is mandatory for all accounts
              </p>
            </div>
            <Button 
              onClick={() => setShowTwoFactorSetup(true)}
              variant="outline"
              disabled={statusLoading}
            >
              Manage 2FA
            </Button>
          </div>

          {(twoFactorStatus as any)?.enabled && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg mt-[0px] mb-[0px] pt-[0px] pb-[0px]">
              <div className="flex items-center gap-2 text-green-800">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">2FA is enabled</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your account is protected with two-factor authentication
              </p>
            </div>
          )}

          <Separator />

          <div className="space-y-3 mt-[0px] mb-[0px] pt-[3px] pb-[3px]">
            <h4 className="font-medium">Password Security</h4>
            <p className="text-sm text-muted-foreground">
              Your password is managed through your authentication provider. 
              To change your password, please update it in your account settings.
            </p>
          </div>
        </CardContent>
      </Card>
      {/* Privacy & Data */}
      <Card>
        <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[5px] pb-[5px]">
          <CardTitle>Privacy & Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg pt-[0px] pb-[0px]">
            <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                Data Privacy Notice
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Your activity is logged for security and audit purposes. This includes 
                login times, page visits, and actions performed within the application.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Notifications */}
      <Card>
        <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[5px] pb-[5px]">
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="email-notifications">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email notifications for important updates
              </p>
            </div>
            <Switch id="email-notifications" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="task-notifications">Task Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about upcoming task due dates
              </p>
            </div>
            <Switch id="task-notifications" defaultChecked />
          </div>
        </CardContent>
      </Card>
      {/* Email Configuration */}
      <UserEmailConfig />
      {/* Navigation Customization */}
      <NavigationCustomizer />
    </div>
  );
}