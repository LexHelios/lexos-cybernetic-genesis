import React, { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, Key, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (keyData: { id: string; name: string; permissions: string[] }) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [step, setStep] = useState<'create' | 'display'>('create');
  const [keyName, setKeyName] = useState('');
  const [permissions, setPermissions] = useState({
    read: true,
    write: false,
    admin: false,
  });
  const [apiKey, setApiKey] = useState('');
  const [keyId, setKeyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);

  const handleCreate = async () => {
    setError('');
    
    if (!keyName.trim()) {
      setError('Please provide a name for the API key');
      return;
    }

    const selectedPermissions = Object.entries(permissions)
      .filter(([_, enabled]) => enabled)
      .map(([permission]) => permission);

    if (selectedPermissions.length === 0) {
      setError('Please select at least one permission');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.generateApiKey(keyName, selectedPermissions);
      setApiKey(response.api_key);
      setKeyId(response.key_id);
      setStep('display');
      
      // Call onSuccess with the new key data
      onSuccess?.({
        id: response.key_id,
        name: keyName,
        permissions: selectedPermissions,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to generate API key');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
  };

  const handleClose = () => {
    // Reset state
    setStep('create');
    setKeyName('');
    setPermissions({ read: true, write: false, admin: false });
    setApiKey('');
    setKeyId('');
    setError('');
    setCopied(false);
    setShowKey(true);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {step === 'create' ? 'Generate API Key' : 'Your New API Key'}
          </DialogTitle>
          <DialogDescription>
            {step === 'create' 
              ? 'Create a new API key with specific permissions for programmatic access'
              : 'Save this key securely. You won\'t be able to see it again!'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'create' ? (
          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., Production Server"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                A descriptive name to identify this key
              </p>
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perm-read"
                    checked={permissions.read}
                    onCheckedChange={(checked) => 
                      setPermissions(prev => ({ ...prev, read: checked as boolean }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="perm-read" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Read Access
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      View agents, tasks, and system status
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perm-write"
                    checked={permissions.write}
                    onCheckedChange={(checked) => 
                      setPermissions(prev => ({ ...prev, write: checked as boolean }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="perm-write" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Write Access
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Create and manage tasks, update configurations
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="perm-admin"
                    checked={permissions.admin}
                    onCheckedChange={(checked) => 
                      setPermissions(prev => ({ ...prev, admin: checked as boolean }))
                    }
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="perm-admin" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Admin Access
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Full system control including user management
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This is the only time you'll see this key. Save it securely now!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={showKey ? apiKey : '••••••••••••••••••••••••••••••••'}
                    readOnly
                    className="font-mono text-sm pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Key Details</Label>
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Name:</span> {keyName}</p>
                <p><span className="text-muted-foreground">ID:</span> {keyId}</p>
                <p><span className="text-muted-foreground">Permissions:</span> {
                  Object.entries(permissions)
                    .filter(([_, enabled]) => enabled)
                    .map(([permission]) => permission)
                    .join(', ')
                }</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'create' ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Key'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;