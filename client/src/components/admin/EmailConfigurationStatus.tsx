import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Mail, AlertTriangle } from "lucide-react";

interface EmailStatus {
  configured: boolean;
}

export default function EmailConfigurationStatus() {
  const { data: emailStatus, isLoading } = useQuery<EmailStatus>({
    queryKey: ["/api/email-status"],
    refetchInterval: 10000, // Check every 10 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking email configuration...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Configuration
        </CardTitle>
        <CardDescription>
          Email service status for sending invitations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {emailStatus?.configured ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <Badge variant="default" className="bg-green-100 text-green-800">
                Configured
              </Badge>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-500" />
              <Badge variant="destructive">
                Not Configured
              </Badge>
            </>
          )}
        </div>

        {!emailStatus?.configured && (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Email service not configured</p>
                <p className="text-sm">
                  Invitations will show codes in the interface instead of sending emails.
                  To enable email sending, add one of these environment variables:
                </p>
                <div className="bg-gray-50 p-3 rounded text-sm font-mono space-y-1">
                  <p><strong>For Gmail:</strong></p>
                  <p>GMAIL_USER=your-email@gmail.com</p>
                  <p>GMAIL_APP_PASSWORD=your-app-password</p>
                  <br />
                  <p><strong>For other SMTP:</strong></p>
                  <p>SMTP_HOST=smtp.your-provider.com</p>
                  <p>SMTP_PORT=587</p>
                  <p>SMTP_USER=your-email@domain.com</p>
                  <p>SMTP_PASS=your-password</p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {emailStatus?.configured && (
          <Alert>
            <CheckCircle className="w-4 h-4" />
            <AlertDescription>
              Email service is configured and ready to send invitations.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}