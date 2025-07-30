import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Copy, AlertTriangle } from "lucide-react";

interface RegistrationTwoFactorSetupProps {
  setupData: {
    qrCodeDataUrl: string;
    manualEntryKey: string;
    backupCodes: string[];
  };
  userId: string;
  onComplete: (success: boolean) => void;
}

export function RegistrationTwoFactorSetup({ setupData, userId, onComplete }: RegistrationTwoFactorSetupProps) {
  const [verificationToken, setVerificationToken] = useState("");
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The code has been copied to your clipboard.",
    });
  };

  const verifySetupMutation = useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      const res = await apiRequest("POST", "/api/register/2fa/verify", {
        token,
        userId,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "2FA Setup Complete",
        description: "Two-factor authentication has been enabled for your account.",
      });
      onComplete(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVerifySetup = () => {
    if (!verificationToken || verificationToken.length !== 6) {
      toast({
        title: "Please enter a valid 6-digit code",
        variant: "destructive",
      });
      return;
    }

    verifySetupMutation.mutate({ token: verificationToken });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Two-factor authentication is mandatory for all accounts. Please complete setup to continue.
        </AlertDescription>
      </Alert>

      <div>
        <Label className="text-base font-semibold">Step 1: Scan QR Code</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Open your authenticator app (Google Authenticator, Authy, etc.) and scan this QR code:
        </p>
        <div className="flex justify-center p-4 bg-white rounded-lg border">
          <img 
            src={setupData.qrCodeDataUrl} 
            alt="2FA QR Code" 
            className="w-48 h-48"
          />
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold">Alternative: Manual Entry</Label>
        <p className="text-sm text-muted-foreground mb-2">
          If you can't scan the QR code, enter this key manually:
        </p>
        <div className="flex gap-2">
          <Input 
            value={setupData.manualEntryKey} 
            readOnly 
            className="font-mono text-sm"
          />
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => copyToClipboard(setupData.manualEntryKey)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold">Step 2: Save Backup Codes</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Save these backup codes securely. You can use them to access your account if you lose your device.
        </p>
        <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded font-mono text-sm mb-2">
          {setupData.backupCodes.map((code, index) => (
            <div key={index}>{code}</div>
          ))}
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
        >
          <Copy className="h-4 w-4 mr-2" />
          Copy All Codes
        </Button>
      </div>

      <Separator />

      <div>
        <Label className="text-base font-semibold">Step 3: Verify Setup</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Enter the 6-digit code from your authenticator app to complete setup:
        </p>
        <Input
          value={verificationToken}
          onChange={(e) => setVerificationToken(e.target.value)}
          placeholder="123456"
          maxLength={6}
          className="mb-4"
        />
        
        <div className="flex gap-2">
          <Button
            onClick={handleVerifySetup}
            disabled={!verificationToken || verifySetupMutation.isPending}
            className="flex-1"
          >
            {verifySetupMutation.isPending ? "Verifying..." : "Complete Setup"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onComplete(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}