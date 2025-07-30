import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Mail, TestTube, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const emailConfigSchema = z.object({
  smtpHost: z.string().min(1, "SMTP host is required"),
  smtpPort: z.number().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email("Valid email address required"),
  smtpPassword: z.string().min(1, "Password is required"),
  imapHost: z.string().optional(),
  imapPort: z.number().min(1).max(65535).optional(),
  imapSecure: z.boolean().optional(),
});

type EmailConfigFormData = z.infer<typeof emailConfigSchema>;

export function UserEmailConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isTesting, setIsTesting] = useState(false);

  // Get user's email status
  const { data: emailStatus, isLoading } = useQuery({
    queryKey: ['/api/user-email/status'],
    staleTime: 30000,
  });

  interface EmailStatus {
    configured: boolean;
    tested: boolean;
  }

  const form = useForm<EmailConfigFormData>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      smtpHost: "",
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: user?.email || "", // Auto-populate with user's email
      smtpPassword: "",
      imapHost: "",
      imapPort: 993,
      imapSecure: true,
    },
  });

  // Configure email mutation
  const configureEmailMutation = useMutation({
    mutationFn: async (data: EmailConfigFormData) => {
      const response = await fetch('/api/user-email/configure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Configuration Updated",
        description: "Your email settings have been saved successfully.",
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user-email/status'] });
    },
    onError: () => {
      toast({
        title: "Configuration Failed",
        description: "Failed to update email configuration. Please check your settings.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Test email configuration
  const testConfiguration = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/user-email/test', {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Configuration Test Successful",
          description: "Your email settings are working correctly.",
          duration: 5000,
        });
      } else {
        toast({
          title: "Configuration Test Failed",
          description: "Please check your email settings and try again.",
          variant: "destructive",
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Unable to test email configuration.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Auto-configure SMTP settings based on email domain
  const autoConfigureEmailSettings = (email: string) => {
    if (!email) return {};
    
    const domain = email.split('@')[1]?.toLowerCase();
    
    switch (domain) {
      case 'gmail.com':
        return {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpSecure: false,
          imapHost: 'imap.gmail.com',
          imapPort: 993,
          imapSecure: true,
          requiresAppPassword: true,
          instructions: 'Gmail requires an App Password. Do the following: 1) Enable 2-Factor Authentication if not already active 2) Go to Google Account Security or https://myaccount.google.com/security 3) Search for "App passwords" (may need to scroll) 4) Generate app password and copy it below'
        };
      case 'outlook.com':
      case 'hotmail.com':
      case 'live.com':
        return {
          smtpHost: 'smtp-mail.outlook.com',
          smtpPort: 587,
          smtpSecure: false,
          imapHost: 'outlook.office365.com',
          imapPort: 993,
          imapSecure: true,
          requiresAppPassword: true,
          instructions: 'Outlook requires an App Password. Do the following: 1) Go to Microsoft Account Security or https://mysignins.microsoft.com 2) Additional security options 3) Select App passwords. 4) Create and copy the App password below.'
        };
      case 'yahoo.com':
        return {
          smtpHost: 'smtp.mail.yahoo.com',
          smtpPort: 587,
          smtpSecure: false,
          imapHost: 'imap.mail.yahoo.com',
          imapPort: 993,
          imapSecure: true,
          requiresAppPassword: true,
          instructions: 'Yahoo requires an App Password. Go to Yahoo Account Security → Generate app password.'
        };
      default:
        return {
          smtpHost: '',
          smtpPort: 587,
          smtpSecure: false,
          imapHost: '',
          imapPort: 993,
          imapSecure: true,
          requiresAppPassword: false,
          instructions: 'Contact your IT department or email provider for SMTP/IMAP settings.'
        };
    }
  };

  // Load existing configuration when available
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        const user = await queryClient.fetchQuery({
          queryKey: ['/api/user'],
          staleTime: 30000,
        });
        
        if (user && typeof user === 'object') {
          // Auto-populate email address from user account
          const userEmail = (user as any).email || '';
          const autoConfig = autoConfigureEmailSettings(userEmail);
          const hasExistingConfig = (user as any).emailConfigured && (user as any).smtpHost;
          
          // If user has existing email configuration, use it; otherwise use auto-config
          if (hasExistingConfig) {
            form.reset({
              smtpHost: (user as any).smtpHost || '',
              smtpPort: (user as any).smtpPort || 587,
              smtpSecure: (user as any).smtpSecure !== undefined ? (user as any).smtpSecure : false,
              smtpUser: (user as any).smtpUser || userEmail,
              smtpPassword: '', // Never pre-fill password for security
              imapHost: (user as any).imapHost || '',
              imapPort: (user as any).imapPort || 993,
              imapSecure: (user as any).imapSecure !== undefined ? (user as any).imapSecure : true,
            });
          } else {
            // Use auto-configuration for new users
            form.reset({
              smtpHost: autoConfig.smtpHost || '',
              smtpPort: autoConfig.smtpPort || 587,
              smtpSecure: autoConfig.smtpSecure || false,
              smtpUser: userEmail,
              smtpPassword: '', // Never pre-fill password for security
              imapHost: autoConfig.imapHost || '',
              imapPort: autoConfig.imapPort || 993,
              imapSecure: autoConfig.imapSecure !== false,
            });
            
            // Show auto-configuration message only for new configurations
            if (autoConfig.smtpHost) {
              toast({
                title: "Email Settings Auto-configured",
                description: `Settings automatically configured for ${userEmail.split('@')[1]}. ${autoConfig.requiresAppPassword ? 'App password required.' : 'Enter your email password.'}`,
                duration: 8000,
              });
            }
          }
          
          // Show helpful message if settings are pre-configured from invitation but not yet saved
          if ((user as any).smtpHost && !(user as any).emailConfigured) {
            toast({
              title: "Email Settings Pre-configured",
              description: "Your email settings have been automatically configured based on your invitation. Just add your email password to complete the setup.",
              duration: 8000,
            });
          }
        }
      } catch (error) {
        console.error('Error loading existing config:', error);
      }
    };

    loadExistingConfig();
  }, [form, queryClient, toast]);

  const onSubmit = (data: EmailConfigFormData) => {
    configureEmailMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading email configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-1.5 p-6 pt-[5px] pb-[5px]">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Personal Email Configuration
        </CardTitle>
        <CardDescription>
          Configure your personal email account to send emails directly from your own address.
          {/* Show password requirements based on email domain */}
          {user?.email && (() => {
            const domain = user.email.split('@')[1]?.toLowerCase();
            const autoConfig = autoConfigureEmailSettings(user.email);
            if (autoConfig.requiresAppPassword) {
              if (domain === 'gmail.com') {
                return (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-orange-800">
                      <div className="font-medium text-sm mb-2">🔑 App Password Required</div>
                      <div className="text-xs space-y-1">
                        <div>Gmail requires an App Password. Do the following:</div>
                        <div>1) Go to Google Account Security or <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://myaccount.google.com/security</a></div>
                        <div>2) Enable 2-Factor Authentication if not already active, and when it is select 2-Step Verification</div>
                        <div>3) Search for "App passwords" (may need to scroll down) and click on the chevron &gt;</div>
                        <div>4) Enter an App name, create app password, and copy it below</div>
                        <div>5) Save Configuration</div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div className="flex items-center gap-2 mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="text-orange-800">
                      <div className="font-medium text-sm mb-2">🔑 App Password Required</div>
                      <div className="text-xs space-y-1">
                        <div>Outlook requires an App Password. Do the following:</div>
                        <div>1) Go to Microsoft Account Security or <a href="https://mysignins.microsoft.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">https://mysignins.microsoft.com</a></div>
                        <div>2) Select Security Info or Additional Security Options</div>
                        <div>3) Click Add sign-in method and select App password</div>
                        <div>4) Create and copy the App password below</div>
                      </div>
                    </div>
                  </div>
                );
              }
            }
          })()}
          {/* Show if settings were pre-configured from invitation */}
          {form.watch('smtpHost') && !form.watch('smtpPassword') && (
            <div className="flex items-center gap-2 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <span className="text-sm">
                  📧 Email settings pre-configured from your invitation! Just add your password to complete setup.
                </span>
              </div>
            </div>
          )}
          {(emailStatus as EmailStatus)?.configured && (
            <div className="flex items-center gap-2 mt-2">
              {(emailStatus as EmailStatus).tested ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Configuration verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600">
                  <XCircle className="h-4 w-4" />
                  Configuration needs testing
                </span>
              )}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SMTP Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">SMTP Settings (Outgoing Mail)</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="smtpHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Server</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="smtpPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="587" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 587)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="smtpUser"
                render={({ field }) => (
                  <FormItem className="space-y-2 mt-[0px] mb-[0px]">
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smtpPassword"
                render={({ field }) => {
                  const autoConfig = user?.email ? autoConfigureEmailSettings(user.email) : {};
                  const passwordLabel = autoConfig.requiresAppPassword ? "App Password (Required)" : "Email Password";
                  const placeholder = autoConfig.requiresAppPassword ? "Enter your app password" : "Enter your email password";
                  
                  return (
                    <FormItem className="space-y-2 mt-[0px] mb-[0px]">
                      <FormLabel>{passwordLabel}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder={placeholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="smtpSecure"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Use SSL/TLS encryption</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* IMAP Settings */}
            <div className="space-y-4 mt-[0px] mb-[0px]">
              <h3 className="text-lg font-medium">IMAP Settings (Incoming Mail - Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="imapHost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMAP Server</FormLabel>
                      <FormControl>
                        <Input placeholder="imap.gmail.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imapPort"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Port</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="993" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 993)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="imapSecure"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 mt-[0px] mb-[0px]">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Use SSL/TLS encryption for IMAP</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3">
              <Button 
                type="submit" 
                disabled={configureEmailMutation.isPending}
                className="flex-1"
              >
                {configureEmailMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Configuration...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
              
              {(emailStatus as EmailStatus)?.configured && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={testConfiguration}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Test Configuration
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}