import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2, Users, Calendar, MessageSquare, Eye, EyeOff } from "lucide-react";
import React from "react";
import { validatePassword } from "@/lib/password-validation";
import { TwoFactorLogin } from "@/components/two-factor-login";
import { TwoFactorSetup } from "@/components/two-factor-setup";
import { RegistrationTwoFactorSetup } from "@/components/registration-two-factor-setup";
import { queryClient } from "@/lib/queryClient";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // State for login form
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });

  // State for registration form
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    email: "",
    firstName: "",
    lastName: "",
    invitationCode: "",
  });

  // State for password visibility
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("login");

  // State for 2FA login flow
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  
  // State for 2FA setup after registration
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<any>(null);

  // Get invitation code and tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const invitationCodeFromUrl = urlParams.get("invitation");
  const tabFromUrl = urlParams.get("tab");

  // Set invitation code if it exists in URL (moved to useEffect to prevent render-time state updates)
  React.useEffect(() => {
    if (invitationCodeFromUrl && !registerData.invitationCode) {
      setRegisterData(prev => ({ ...prev, invitationCode: invitationCodeFromUrl }));
    }
  }, [invitationCodeFromUrl, registerData.invitationCode]);

  // Set active tab based on URL parameters
  React.useEffect(() => {
    const defaultTab = tabFromUrl || (invitationCodeFromUrl ? "register" : "login");
    setActiveTab(defaultTab);
  }, [tabFromUrl, invitationCodeFromUrl]);

  // Redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, user, setLocation]);

  if (isAuthenticated && user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.username || !loginData.password) {
      toast({
        title: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    loginMutation.mutate(loginData, {
      onSuccess: (response: any) => {
        if (response.requiresTwoFactor) {
          setShowTwoFactor(true);
          toast({
            title: "Two-Factor Authentication Required",
            description: "Please enter your verification code to continue.",
          });
        }
      },
    });
  };

  const handleTwoFactorSuccess = (user: any) => {
    queryClient.setQueryData(["/api/user"], user);
    setShowTwoFactor(false);
    setLocation("/dashboard");
  };

  const handleTwoFactorCancel = () => {
    setShowTwoFactor(false);
    setLoginData({ username: "", password: "" });
  };

  const handleTwoFactorSetupComplete = (success: boolean) => {
    if (success) {
      toast({
        title: "2FA Setup Complete",
        description: "Account created successfully! Please sign in with your new credentials.",
      });
      
      // Reset registration form
      setRegisterData({
        username: "",
        password: "",
        confirmPassword: "",
        email: "",
        firstName: "",
        lastName: "",
        invitationCode: "",
      });
      
      // Redirect to login tab
      setTimeout(() => {
        setShowTwoFactorSetup(false);
        setTwoFactorSetupData(null);
        setActiveTab("login");
      }, 1500);
    } else {
      setShowTwoFactorSetup(false);
      setTwoFactorSetupData(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerData.email || !registerData.password || !registerData.invitationCode) {
      toast({
        title: "Please fill in all required fields including invitation code",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    const passwordError = validatePassword(registerData.password);
    if (passwordError) {
      toast({
        title: passwordError,
        variant: "destructive",
      });
      return;
    }

    // Use email as username
    const { confirmPassword, ...registrationData } = registerData;
    registrationData.username = registrationData.email;
    
    registerMutation.mutate(registrationData, {
      onSuccess: (response: any) => {
        if (response.requiresTwoFactorSetup) {
          setTwoFactorSetupData(response);
          setShowTwoFactorSetup(true);
        }
      }
    });
  };

  // Show 2FA login if required
  if (showTwoFactor) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gray-50">
        <TwoFactorLogin
          onSuccess={handleTwoFactorSuccess}
          onCancel={handleTwoFactorCancel}
        />
      </div>
    );
  }

  // Show 2FA setup after registration
  if (showTwoFactorSetup && twoFactorSetupData) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Setup Two-Factor Authentication</h1>
            <p className="text-muted-foreground mt-2">
              Complete your account setup by configuring 2FA
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <RegistrationTwoFactorSetup 
                setupData={twoFactorSetupData.twoFactorSetup}
                userId={twoFactorSetupData.userId}
                onComplete={handleTwoFactorSetupComplete}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight">ClientHub</h1>
            <p className="text-muted-foreground mt-2">
              Professional CRM & Project Management
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Email</Label>
                      <Input
                        id="login-username"
                        type="email"
                        value={loginData.username}
                        onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginData.password}
                          onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Enter your password"
                          required
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <div
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer select-none"
                          style={{ 
                            zIndex: 10,
                            color: '#6b7280',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showLoginPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>

                    <div className="text-center mt-4">
                      <button
                        type="button"
                        onClick={() => setLocation("/forgot-password")}
                        className="text-sm text-muted-foreground hover:text-primary underline"
                      >
                        Forgot your password?
                      </button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    {invitationCodeFromUrl 
                      ? "Complete your registration using the invitation code"
                      : "Registration requires a valid invitation code"
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="invitation-code">Invitation Code *</Label>
                      <Input
                        id="invitation-code"
                        type="text"
                        value={registerData.invitationCode}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, invitationCode: e.target.value }))}
                        placeholder="Enter invitation code"
                        readOnly={!!invitationCodeFromUrl}
                        required
                      />
                      {invitationCodeFromUrl && (
                        <p className="text-sm text-muted-foreground">
                          Invitation code has been automatically filled from your invitation link.
                        </p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input
                          id="first-name"
                          type="text"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input
                          id="last-name"
                          type="text"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (will be used as your username)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showRegisterPassword ? "text" : "password"}
                          value={registerData.password}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Min 12 chars with letters, numbers & symbols"
                          required
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <div
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer select-none"
                          style={{ 
                            zIndex: 10,
                            color: '#6b7280',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showRegisterPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Password must be at least 12 characters with letters, numbers, and special characters
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={registerData.confirmPassword}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm your password"
                          required
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <div
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute top-1/2 right-3 transform -translate-y-1/2 cursor-pointer select-none"
                          style={{ 
                            zIndex: 10,
                            color: '#6b7280',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={20} />
                          ) : (
                            <Eye size={20} />
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right side - Hero */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-8 flex items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6">
            Everything you need to manage your business
          </h2>

          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Contact Management</h3>
                <p className="text-sm text-muted-foreground">
                  Organize clients, prospects, and team members
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-green-100 dark:bg-green-900 p-3 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Project Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor progress and deadlines
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-lg">
                <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">
                  Work together on tasks and projects
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-lg">
                <MessageSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">Communication Hub</h3>
                <p className="text-sm text-muted-foreground">
                  Email integration and call tracking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}