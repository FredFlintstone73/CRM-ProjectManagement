import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Shield, QrCode, Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TwoFactorStatus {
  enabled: boolean;
  backupCodesRemaining: number;
}

interface SetupData {
  secret: string;
  qrCodeDataUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export function TwoFactorSetup() {
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isDisableOpen, setIsDisableOpen] = useState(false);
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [disableBackupCode, setDisableBackupCode] = useState('');
  const [regenerateToken, setRegenerateToken] = useState('');
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch 2FA status
  const { data: status, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ['/api/auth/2fa/status'],
    staleTime: 30000,
  });

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: () => apiRequest('/api/auth/2fa/setup', { method: 'POST' }),
    onSuccess: (data: SetupData) => {
      setSetupData(data);
    },
    onError: () => {
      toast({
        title: "Setup Failed",
        description: "Failed to initialize 2FA setup. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Verify setup mutation
  const verifySetupMutation = useMutation({
    mutationFn: (data: { token: string; secret: string; backupCodes: string[] }) =>
      apiRequest('/api/auth/2fa/verify-setup', { method: 'POST', body: data }),
    onSuccess: () => {
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });
      setIsSetupOpen(false);
      setSetupData(null);
      setVerificationToken('');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: (data: { token?: string; backupCode?: string }) =>
      apiRequest('/api/auth/2fa/disable', { method: 'POST', body: data }),
    onSuccess: () => {
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
      setIsDisableOpen(false);
      setDisableToken('');
      setDisableBackupCode('');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Disable 2FA",
        description: error.message || "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateMutation = useMutation({
    mutationFn: (data: { token: string }) =>
      apiRequest('/api/auth/2fa/regenerate-backup-codes', { method: 'POST', body: data }),
    onSuccess: (data: { backupCodes: string[] }) => {
      setNewBackupCodes(data.backupCodes);
      setRegenerateToken('');
      toast({
        title: "Backup Codes Regenerated",
        description: "New backup codes have been generated. Please save them securely.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/2fa/status'] });
    },
    onError: (error: any) => {
      toast({
        title: "Regeneration Failed",
        description: error.message || "Failed to regenerate backup codes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartSetup = () => {
    setIsSetupOpen(true);
    setupMutation.mutate();
  };

  const handleVerifySetup = () => {
    if (!setupData || !verificationToken) return;
    verifySetupMutation.mutate({
      token: verificationToken,
      secret: setupData.secret,
      backupCodes: setupData.backupCodes,
    });
  };

  const handleDisable2FA = () => {
    const data: { token?: string; backupCode?: string } = {};
    if (disableToken) data.token = disableToken;
    if (disableBackupCode) data.backupCode = disableBackupCode;
    disableMutation.mutate(data);
  };

  const handleRegenerateBackupCodes = () => {
    if (!regenerateToken) return;
    regenerateMutation.mutate({ token: regenerateToken });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-4">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account
            </p>
            {status?.enabled && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Enabled
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {status.backupCodesRemaining} backup codes remaining
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {!status?.enabled ? (
              <Button onClick={handleStartSetup} disabled={setupMutation.isPending}>
                {setupMutation.isPending ? "Setting up..." : "Enable 2FA"}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setIsRegenerateOpen(true)}
                disabled={regenerateMutation.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate Backup Codes
              </Button>
            )}
          </div>
        </div>

        {status?.enabled && status.backupCodesRemaining === 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have no backup codes remaining. Consider regenerating new backup codes.
            </AlertDescription>
          </Alert>
        )}

        {/* Setup Dialog */}
        <Dialog open={isSetupOpen} onOpenChange={setIsSetupOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set up Two-Factor Authentication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {setupData && (
                <>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="flex justify-center">
                      <img 
                        src={setupData.qrCodeDataUrl} 
                        alt="2FA QR Code" 
                        className="border rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Manual Entry Key</Label>
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
                    <Label>Backup Codes</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Save these codes securely. You can use them to access your account if you lose your device.
                    </p>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded font-mono text-sm">
                      {setupData.backupCodes.map((code, index) => (
                        <div key={index}>{code}</div>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Codes
                    </Button>
                  </div>

                  <Separator />

                  <div>
                    <Label>Verification Code</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Enter the 6-digit code from your authenticator app
                    </p>
                    <Input
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleVerifySetup}
                      disabled={!verificationToken || verifySetupMutation.isPending}
                      className="flex-1"
                    >
                      {verifySetupMutation.isPending ? "Verifying..." : "Enable 2FA"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsSetupOpen(false);
                        setSetupData(null);
                        setVerificationToken('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>



        {/* Regenerate Backup Codes Dialog */}
        <Dialog open={isRegenerateOpen} onOpenChange={(open) => {
          setIsRegenerateOpen(open);
          if (!open) {
            setNewBackupCodes([]);
            setRegenerateToken('');
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Regenerate Backup Codes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {newBackupCodes.length === 0 ? (
                <>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This will invalidate all existing backup codes and generate new ones.
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Verification Code</Label>
                    <Input
                      value={regenerateToken}
                      onChange={(e) => setRegenerateToken(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleRegenerateBackupCodes}
                      disabled={!regenerateToken || regenerateMutation.isPending}
                      className="flex-1"
                    >
                      {regenerateMutation.isPending ? "Generating..." : "Generate New Codes"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsRegenerateOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label>New Backup Codes</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Save these codes securely. Your old backup codes are no longer valid.
                    </p>
                    <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded font-mono text-sm">
                      {newBackupCodes.map((code, index) => (
                        <div key={index}>{code}</div>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2"
                      onClick={() => copyToClipboard(newBackupCodes.join('\n'))}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All Codes
                    </Button>
                  </div>

                  <Button 
                    onClick={() => setIsRegenerateOpen(false)}
                    className="w-full"
                  >
                    Done
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}