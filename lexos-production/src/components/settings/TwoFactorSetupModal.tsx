import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Shield, Copy, Check } from 'lucide-react';
import { apiClient } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface TwoFactorSetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      initiate2FA();
    } else {
      // Reset state when modal closes
      setStep('setup');
      setQrCode('');
      setSecret('');
      setVerificationCode('');
      setError('');
    }
  }, [open]);

  const initiate2FA = async () => {
    setLoading(true);
    try {
      const response = await apiClient.enable2FA();
      setQrCode(response.qr_code);
      setSecret(response.secret);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to initialize 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Secret key copied to clipboard',
    });
  };

  const handleVerify = async () => {
    setError('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.verify2FA(verificationCode);
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Two-factor authentication has been enabled',
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        setError('Invalid verification code');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify 2FA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {step === 'setup' ? 'Set Up Two-Factor Authentication' : 'Verify 2FA Setup'}
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' 
              ? 'Scan the QR code with your authenticator app or enter the secret key manually'
              : 'Enter the 6-digit code from your authenticator app to complete setup'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' ? (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrCode ? (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Manual Entry Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopySecret}
                    >
                      {copied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Save this key in a secure place as a backup
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    After scanning, you'll need to enter a verification code to complete setup
                  </AlertDescription>
                </Alert>
              </>
            ) : null}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="text-center text-2xl font-mono tracking-widest"
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {step === 'setup' ? (
            <Button 
              onClick={() => setStep('verify')} 
              disabled={!qrCode || loading}
            >
              Continue to Verify
            </Button>
          ) : (
            <Button 
              onClick={handleVerify} 
              disabled={loading || verificationCode.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TwoFactorSetupModal;