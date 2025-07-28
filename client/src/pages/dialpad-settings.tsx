import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Phone, Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
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
    mutationFn: () => apiRequest('POST', '/api/dialpad/setup-webhooks', {}),
    onSuccess: (data: any) => {
      toast({
        title: "Webhooks Setup Complete",
        description: `Dialpad webhooks configured successfully for: ${data.webhookUrl}. Call transcripts and text messages will now be captured automatically.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dialpad/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Webhook Setup Failed",
        description: error.message || "Failed to setup webhooks. Please check your API credentials.",
        variant: "destructive",
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
      console.log('🎯 Frontend received test contact match response:', data);
      console.log('🔍 Response type:', typeof data, 'Keys:', Object.keys(data || {}));
      
      // Handle empty response case
      if (!data || Object.keys(data).length === 0) {
        toast({
          title: "Error",
          description: "Received empty response from server. Check server logs for details.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Contact Match Test",
        description: data.matched 
          ? `✅ Found match! Phone ${data.phoneNumber} → Contact ID: ${data.contactId}`
          : `❌ No contact found for phone number: ${data.phoneNumber}`,
        variant: data.matched ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      console.error('Test contact match error:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test contact matching.",
        variant: "destructive",
      });
    },
  });

  const handleTestContact = () => {
    if (!testPhoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to test contact matching.",
        variant: "destructive",
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
            >
              {setupWebhooksMutation.isPending ? "Setting up webhooks..." : "Setup Webhooks"}
            </Button>
            
            {setupWebhooksMutation.isSuccess && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-800 dark:text-green-200">
                    Webhooks configured successfully! Call transcripts and text messages will now be captured automatically.
                  </span>
                </div>
              </div>
            )}
            
            {setupWebhooksMutation.isError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-800 dark:text-red-200">
                    Failed to setup webhooks. Please check your API credentials.
                  </span>
                </div>
              </div>
            )}
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
                >
                  {testContactMutation.isPending ? "Testing..." : "Test Match"}
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