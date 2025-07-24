import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Smartphone, Key, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TwoFactorAuthProps {
  isSetup?: boolean;
  onComplete?: (success: boolean) => void;
}

export default function TwoFactorAuth({ isSetup = false, onComplete }: TwoFactorAuthProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'setup' | 'verify' | 'login'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [backup_codes, setBackupCodes] = useState<string[]>([]);

  useEffect(() => {
    if (isSetup && step === 'setup') {
      generateSecret();
    }
  }, [isSetup, step]);

  const generateSecret = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setSecret(data.secret);
        setQrCode(data.qrCode);
        setBackupCodes(data.backupCodes);
        setStep('verify');
      } else {
        throw new Error('Failed to generate 2FA secret');
      }
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "Failed to generate 2FA secret. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyToken = async () => {
    if (!token || token.length !== 6) {
      toast({
        title: "Invalid Token",
        description: "Please enter a 6-digit token from your authenticator app.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          secret: isSetup ? secret : undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: isSetup ? "2FA has been enabled successfully!" : "Login successful!",
          variant: "default",
        });
        onComplete?.(true);
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid token. Please try again.",
        variant: "destructive",
      });
      onComplete?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && token.length === 6) {
      verifyToken();
    }
  };

  if (step === 'setup') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <p className="text-sm text-muted-foreground">
            Secure your account with an additional layer of protection
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <Button 
              onClick={generateSecret} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Set up 2FA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <Smartphone className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Scan QR Code</CardTitle>
          <p className="text-sm text-muted-foreground">
            Use your authenticator app to scan this QR code
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {qrCode && (
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="manual-secret">Manual Entry Code</Label>
            <Input
              id="manual-secret"
              value={secret}
              readOnly
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Enter this code manually if you can't scan the QR code
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="token">Verification Code</Label>
            <Input
              id="token"
              value={token}
              onChange={handleTokenChange}
              onKeyPress={handleKeyPress}
              placeholder="Enter 6-digit code"
              className="font-mono text-center text-lg"
              maxLength={6}
            />
          </div>

          <Button 
            onClick={verifyToken} 
            disabled={isLoading || token.length !== 6}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Verify & Enable 2FA
              </>
            )}
          </Button>

          {backup_codes.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">Backup Codes</h4>
              <p className="text-sm text-yellow-700 mb-3">
                Save these backup codes in a secure location. You can use them to access your account if you lose your device.
              </p>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backup_codes.map((code, index) => (
                  <div key={index} className="bg-white p-2 border rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Login mode - just token input
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
        <CardTitle>Two-Factor Authentication</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code from your authenticator app
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-token">Authentication Code</Label>
          <Input
            id="login-token"
            value={token}
            onChange={handleTokenChange}
            onKeyPress={handleKeyPress}
            placeholder="000000"
            className="font-mono text-center text-lg"
            maxLength={6}
          />
        </div>

        <Button 
          onClick={verifyToken} 
          disabled={isLoading || token.length !== 6}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Key className="h-4 w-4 mr-2" />
              Verify Code
            </>
          )}
        </Button>

        <div className="text-center">
          <Button variant="link" className="text-sm">
            Use backup code instead
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}