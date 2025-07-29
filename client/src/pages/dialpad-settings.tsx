import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Phone, Settings, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface DialpadStatus {
  configured: boolean;
  hasApiToken: boolean;
  hasWebhookSecret: boolean;
  baseUrl: string;
}

export default function DialpadSettings() {
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Dialpad status
  const { data: status, isLoading: statusLoading } = useQuery<DialpadStatus>({
    queryKey: ['/api/dialpad/status'],
    staleTime: 30000,
  });

  // Setup webhooks mutation
  const setupWebhooksMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/dialpad/setup-webhooks');
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('Webhook setup success:', data);
      toast({
        title: "✅ Webhooks Setup Complete",
        description: "All Dialpad webhooks have been configured successfully! Your system will now automatically capture:\n\n• Call transcripts with AI insights\n• Incoming text messages\n• Outgoing text messages\n• Call completion events",
        duration: 8000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dialpad/status'] });
    },
    onError: (error: any) => {
      console.error('Webhook setup error:', error);
      const errorMsg = error.message || "Failed to setup webhooks. Please check your API credentials and try again.";
      toast({
        title: "❌ Webhook Setup Failed",
        description: `Setup encountered an error:\n\n${errorMsg}\n\nPlease verify your Dialpad API credentials and webhook secret are correct.`,
        variant: "destructive",
        duration: 10000,
      });
    },
  });

  // Test contact matching mutation
  const testContactMutation = useMutation({
    mutationFn: async (phoneNumber: string) => {
      const response = await apiRequest('POST', '/api/dialpad/test-contact-match', { phoneNumber });
      return await response.json();
    },
    onSuccess: (data: any) => {
      console.log('Contact match test success:', data);
      if (data.matched) {
        toast({
          title: "✅ Contact Match Found",
          description: `Success! Phone number ${data.phoneNumber} matches contact: ${data.contactName}\n\nThis phone number will automatically link Dialpad calls and texts to the correct contact record.`,
          duration: 6000,
        });
      } else {
        toast({
          title: "❌ No Contact Match",
          description: `Phone number ${data.phoneNumber} was not found in your contact database.\n\nCalls and texts from this number will not be automatically captured. Consider adding this number to an existing contact.`,
          variant: "destructive",
          duration: 8000,
        });
      }
    },
    onError: (error: any) => {
      console.error('Contact match test error:', error);
      toast({
        title: "❌ Test Failed",
        description: `Contact matching test failed:\n\n${error.message || "Network error occurred"}\n\nPlease check your connection and try again.`,
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  const handleTestContact = () => {
    if (!testPhoneNumber.trim()) {
      toast({
        title: "⚠️ Phone Number Required",
        description: "Please enter a phone number to test contact matching.\n\nExample formats: (555) 123-4567, 555-123-4567, or 5551234567",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Basic phone number validation
    const cleanNumber = testPhoneNumber.replace(/[^\d]/g, '');
    if (cleanNumber.length < 10) {
      toast({
        title: "⚠️ Invalid Phone Number",
        description: "Please enter a valid phone number with at least 10 digits.\n\nExample formats: (555) 123-4567, 555-123-4567, or 5551234567",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    testContactMutation.mutate(testPhoneNumber);
  };

  if (statusLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Phone className="h-8 w-8" />
          Dialpad Integration
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure automatic capture of call transcripts, video calls, and text messages from Dialpad into contact interactions.
        </p>
      </div>

      {/* Configuration Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Service Status:</span>
                <Badge variant={status?.configured ? "default" : "destructive"}>
                  {status?.configured ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Configured
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Token:</span>
                <Badge variant={status?.hasApiToken ? "default" : "destructive"}>
                  {status?.hasApiToken ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Present
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Missing
                    </>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Webhook Secret:</span>
                <Badge variant={status?.hasWebhookSecret ? "default" : "destructive"}>
                  {status?.hasWebhookSecret ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Present
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-1" />
                      Missing
                    </>
                  )}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium">Base URL:</span>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {status?.baseUrl || 'Not configured'}
                </p>
              </div>
            </div>
          </div>

          {!status?.configured && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Configuration Required</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    To enable Dialpad integration, add these environment variables to your deployment:
                  </p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-2 space-y-1 font-mono">
                    <li>• DIALPAD_API_TOKEN=your_api_token</li>
                    <li>• DIALPAD_WEBHOOK_SECRET=your_webhook_secret</li>
                    <li>• DIALPAD_WEBHOOK_URL=https://your-app.com/api/dialpad/webhook (optional)</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Setup */}
      {status?.configured && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Webhook Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Setup webhooks to automatically receive call transcripts and text messages from Dialpad.
            </p>
            <Button 
              onClick={() => setupWebhooksMutation.mutate()}
              disabled={setupWebhooksMutation.isPending}
              className="min-w-[140px]"
            >
              {setupWebhooksMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Setup Webhooks
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Contact Matching Test */}
      {status?.configured && (
        <Card>
          <CardHeader>
            <CardTitle>Test Contact Matching</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Test if a phone number can be matched to a contact in your database.
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="testPhone">Phone Number</Label>
                <Input
                  id="testPhone"
                  placeholder="+1 (555) 123-4567"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleTestContact}
                  disabled={testContactMutation.isPending}
                  className="min-w-[120px]"
                >
                  {testContactMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Phone className="h-4 w-4 mr-2" />
                      Test Match
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How Dialpad Integration Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">📞 Call Transcripts</h4>
              <p className="text-muted-foreground">
                When calls are completed, Dialpad sends transcripts with AI-generated moments (action items, sentiment, summaries) 
                to your webhook. The system automatically matches phone numbers to contacts and creates interaction records.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">💬 Text Messages</h4>
              <p className="text-muted-foreground">
                Incoming and outgoing text messages are captured and stored in the contact's Interactions tab, 
                including any media attachments.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">🎯 Contact Matching</h4>
              <p className="text-muted-foreground">
                Phone numbers from Dialpad are matched against all phone fields in your contacts 
                (cell phone, work phone, spouse cell/work phone) using smart matching that handles formatting differences.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">🔒 Security</h4>
              <p className="text-muted-foreground">
                All webhook requests are verified using HMAC signatures to ensure they come from Dialpad. 
                No unauthorized requests can create interaction records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}