
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from '../../hooks/use-toast';
import { apiClient } from '../../services/api';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (keyData: { id: string; name: string; permissions: string[]; }) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ open, onOpenChange, onSuccess }) => {
  const [newKey, setNewKey] = useState({ name: '', key: '' });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveKey = async () => {
    if (!newKey.name || !newKey.key) {
      toast({
        title: "Validation Error",
        description: "Please provide both API key name and value.",
        variant: "destructive",
      });
      return;
    }

    if (newKey.key.length < 32) {
      toast({
        title: "Security Error",
        description: "API key must be at least 32 characters long for security.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.request<{ id?: string; api_key: string }>('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          name: newKey.name,
          api_key: newKey.key,
          created_at: new Date().toISOString(),
          status: 'active'
        })
      });
      
      const keyData = {
        id: response.id || `key_${Date.now()}`,
        name: newKey.name,
        permissions: ['read', 'write'] as string[]
      };
      
      onSuccess(keyData);

      toast({
        title: "API Key Created",
        description: `API key "${newKey.name}" has been successfully created and activated.`,
      });
      onOpenChange(false);
      setNewKey({ name: '', key: '' });
    } catch (error: any) {
      console.error("Error saving API key:", error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create API key. Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateSecureKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'nxs_';
    for (let i = 0; i < 40; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewKey({ ...newKey, key: result });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a secure API key for accessing NEXUS Genesis system resources and services.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="key-name" className="text-right">
              Key Name
            </Label>
            <Input
              id="key-name"
              value={newKey.name}
              onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
              className="col-span-3"
              placeholder="e.g., Production API, Development Key"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="key-value" className="text-right">
              Key Value
            </Label>
            <div className="col-span-3 space-y-2">
              <Input
                id="key-value"
                type="password"
                value={newKey.key}
                onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                placeholder="Enter or generate secure API key"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSecureKey}
                className="w-full"
              >
                Generate Secure Key
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveKey} disabled={saving}>
            {saving ? 'Creating...' : 'Create API Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
