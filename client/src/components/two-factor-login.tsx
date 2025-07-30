import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Shield, Smartphone, Key, QrCode, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TwoFactorLoginProps {
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

function TwoFactorLogin({ onSuccess, onCancel }: TwoFactorLoginProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<any>(null);

  const { toast } = useToast();

  const verifyMutation = useMutation({
    mutationFn: async (data: { token?: string; backupCode?: string }) => {
      const res = await apiRequest('POST', '/api/login/2fa', data);
      return await res.json();
    },
    onSuccess: (user: any) => {
      toast({
        title: "Login Successful",
        description: "Welcome back! Two-factor authentication verified.",
      });
      onSuccess(user);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getQRCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/login/2fa/get-qr');
      return await res.json();
    },
    onSuccess: (data) => {
      setQrCodeData(data);
      setShowQRCode(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate QR Code",
        description: error.message || "Unable to generate new QR code. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "The code has been copied to your clipboard.",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (useBackupCode) {
      if (!backupCode) {
        toast({
          title: "Backup Code Required",
          description: "Please enter your backup code.",
          variant: "destructive",
        });
        return;
      }
      verifyMutation.mutate({ backupCode });
    } else {
      if (!verificationCode || verificationCode.length !== 6) {
        toast({
          title: "Invalid Code",
          description: "Please enter a 6-digit verification code.",
          variant: "destructive",
        });
        return;
      }
      verifyMutation.mutate({ token: verificationCode });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        <CardTitle className="text-xl">Two-Factor Authentication</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the verification code from your authenticator app
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!useBackupCode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="verification-code" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  Verification Code
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-lg tracking-widest font-mono"
                  autoComplete="one-time-code"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verificationCode.length !== 6 || verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify"}
              </Button>

              <div className="text-center space-y-2">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setUseBackupCode(true)}
                  className="text-muted-foreground block mx-auto"
                >
                  Use backup code instead
                </Button>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => getQRCodeMutation.mutate()}
                  disabled={getQRCodeMutation.isPending}
                  className="text-muted-foreground flex items-center gap-1 mx-auto"
                >
                  <QrCode className="h-3 w-3" />
                  {getQRCodeMutation.isPending ? "Getting QR code..." : "Lost your authenticator? Get QR code"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="backup-code" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Backup Code
                </Label>
                <Input
                  id="backup-code"
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="ABCD1234"
                  className="text-center text-lg tracking-widest font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter one of your backup codes
                </p>
              </div>

              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  This backup code will be marked as used and cannot be used again.
                </AlertDescription>
              </Alert>

              <Button
                type="submit"
                className="w-full"
                disabled={!backupCode || verifyMutation.isPending}
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify with Backup Code"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setUseBackupCode(false);
                    setBackupCode('');
                  }}
                  className="text-muted-foreground"
                >
                  Use authenticator app instead
                </Button>
              </div>
            </>
          )}

          <div className="text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={verifyMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>

      {/* QR Code Dialog */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Your Authenticator App</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {qrCodeData && (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with your authenticator app
                  </p>
                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    <img 
                      src={qrCodeData.qrCodeDataUrl} 
                      alt="2FA QR Code" 
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                <div>
                  <Label>Manual Entry Key</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={qrCodeData.manualEntryKey} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => copyToClipboard(qrCodeData.manualEntryKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter this key manually if you can't scan the QR code
                  </p>
                </div>

                <Alert>
                  <QrCode className="h-4 w-4" />
                  <AlertDescription>
                    After scanning the QR code or entering the key manually, your authenticator app will generate a 6-digit code. Enter that code above to complete the login.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default TwoFactorLogin;