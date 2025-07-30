import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, QrCode, Copy, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RegistrationTwoFactorSetupProps {
  registrationData: any;
  onComplete: () => void;
  onBack: () => void;
}

export default function RegistrationTwoFactorSetup({ 
  registrationData, 
  onComplete, 
  onBack 
}: RegistrationTwoFactorSetupProps) {
  const { toast } = useToast();
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');

  const { data: qrData, isLoading: qrLoading } = useQuery({
    queryKey: ['/api/auth/2fa/setup'],
    queryFn: async () => {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to setup 2FA');
      return response.json();
    },
    enabled: step === 'setup',
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'include',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setStep('backup');
      toast({
        title: "Two-factor authentication enabled",
        description: "Please save your backup codes",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (verificationCode.length === 6) {
      verifyMutation.mutate(verificationCode);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  if (step === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="p-4">
          <Button variant="ghost" onClick={onBack} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Registration
          </Button>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Setup Two-Factor Authentication</CardTitle>
              <p className="text-muted-foreground">
                Complete your registration by setting up 2FA
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {qrLoading ? (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Generating QR code...</p>
                </div>
              ) : qrData ? (
                <>
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-lg inline-block">
                      <img src={qrData.qrCode} alt="QR Code" className="w-48 h-48" />
                    </div>
                  </div>

                  <Alert>
                    <QrCode className="h-4 w-4" />
                    <AlertDescription>
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </AlertDescription>
                  </Alert>

                  <div>
                    <Label>Manual Entry Key</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input value={qrData.secret} readOnly className="font-mono text-sm" />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(qrData.secret);
                          toast({ title: "Copied to clipboard" });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Button onClick={() => setStep('verify')} className="w-full">
                    Continue to Verification
                  </Button>
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to generate QR code. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="p-4">
          <Button variant="ghost" onClick={() => setStep('setup')} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Setup
          </Button>
        </div>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Verify Your Setup</CardTitle>
              <p className="text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button 
                onClick={handleVerify}
                disabled={verificationCode.length !== 6 || verifyMutation.isPending}
                className="w-full"
              >
                {verifyMutation.isPending ? "Verifying..." : "Verify Code"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'backup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>Save Your Backup Codes</CardTitle>
              <p className="text-muted-foreground">
                Keep these codes safe - you'll need them if you lose access to your authenticator
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm text-center p-2 bg-white rounded border">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  Store these codes in a safe place. Each code can only be used once.
                </AlertDescription>
              </Alert>

              <Button onClick={handleComplete} className="w-full">
                Complete Registration
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}