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
      smtpUser: "",
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

  // Load existing configuration when available
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        const user = await queryClient.fetchQuery({
          queryKey: ['/api/auth/user'],
          staleTime: 30000,
        });
        
        if (user && user.smtpHost) {
          form.reset({
            smtpHost: user.smtpHost || '',
            smtpPort: user.smtpPort || 587,
            smtpSecure: user.smtpSecure || false,
            smtpUser: user.smtpUser || '',
            smtpPassword: '', // Never pre-fill password for security
            imapHost: user.imapHost || '',
            imapPort: user.imapPort || 993,
            imapSecure: user.imapSecure !== false, // Default to true
          });
          
          // Show helpful message if settings are pre-configured but not complete
          if (user.smtpHost && !user.emailConfigured) {
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Personal Email Configuration
        </CardTitle>
        <CardDescription>
          Configure your personal email account to send emails directly from your own address.
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
                  <FormItem>
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password / App Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your email password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
            <div className="space-y-4">
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
                  <FormItem className="flex items-center space-x-2">
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