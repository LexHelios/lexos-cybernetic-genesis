
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
        title: "Error",
        description: "Please provide both key name and value.",
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
          api_key: newKey.key
        })
      });
      
      const keyData = {
        id: response.id || Date.now().toString(),
        name: newKey.name,
        permissions: [] as string[]
      };
      
      onSuccess(keyData);

      toast({
        title: "Success",
        description: "API key saved successfully.",
      });
      onOpenChange(false);
      setNewKey({ name: '', key: '' });
    } catch (error: any) {
      console.error("Error saving API key:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save API key.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for accessing system resources.
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
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="key-value" className="text-right">
              Key Value
            </Label>
            <Input
              id="key-value"
              type="password"
              value={newKey.key}
              onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveKey} disabled={saving}>
            {saving ? 'Saving...' : 'Save Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
