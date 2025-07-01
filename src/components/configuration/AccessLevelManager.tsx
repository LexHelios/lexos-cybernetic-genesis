
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { configurationService, AccessLevel } from '@/services/configurationService';

const AccessLevelManager: React.FC = () => {
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newLevel, setNewLevel] = useState({
    name: '',
    description: '',
    color: 'bg-blue-500',
    permissions: [] as string[]
  });

  useEffect(() => {
    loadAccessLevels();
  }, []);

  const loadAccessLevels = async () => {
    try {
      const config = await configurationService.loadConfiguration();
      setAccessLevels(config.accessLevels);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load access levels",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLevel = async () => {
    try {
      const created = await configurationService.createAccessLevel({
        ...newLevel,
        userCount: 0
      });
      
      setAccessLevels(prev => [...prev, created]);
      setIsCreateDialogOpen(false);
      setNewLevel({ name: '', description: '', color: 'bg-blue-500', permissions: [] });
      
      toast({
        title: "Success",
        description: "Access level created successfully"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to create access level",
        variant: "destructive"
      });
    }
  };

  const handleUpdateLevel = async (level: AccessLevel) => {
    try {
      const updated = await configurationService.updateAccessLevel(level.id, level);
      setAccessLevels(prev => prev.map(l => l.id === level.id ? updated : l));
      setEditingLevel(null);
      
      toast({
        title: "Success",
        description: "Access level updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update access level",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLevel = async (id: string) => {
    try {
      await configurationService.deleteAccessLevel(id);
      setAccessLevels(prev => prev.filter(l => l.id !== id));
      
      toast({
        title: "Success", 
        description: "Access level deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete access level",
        variant: "destructive"
      });
    }
  };

  const colorOptions = [
    { value: 'bg-red-500', label: 'Red' },
    { value: 'bg-blue-500', label: 'Blue' },
    { value: 'bg-green-500', label: 'Green' },
    { value: 'bg-purple-500', label: 'Purple' },
    { value: 'bg-yellow-500', label: 'Yellow' },
    { value: 'bg-pink-500', label: 'Pink' }
  ];

  if (loading) {
    return <div className="flex justify-center p-8">Loading access levels...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Access Levels</h2>
          <p className="text-muted-foreground">Define different access levels for your family members</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Level
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Access Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newLevel.name}
                  onChange={(e) => setNewLevel(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Access level name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={newLevel.description}
                  onChange={(e) => setNewLevel(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this access level"
                />
              </div>
              <div>
                <Label>Color</Label>
                <Select value={newLevel.color} onValueChange={(value) => setNewLevel(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${option.value}`}></div>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateLevel} className="w-full">
                Create Level
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accessLevels.map(level => (
          <Card key={level.id} className="holographic-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${level.color}`}></div>
                  <CardTitle className="text-lg">{level.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Users className="w-3 h-3 mr-1" />
                    {level.userCount}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => setEditingLevel(level)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => handleDeleteLevel(level.id)}
                    disabled={['admin', 'family', 'child'].includes(level.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{level.description}</p>
              {level.permissions && level.permissions.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {level.permissions.slice(0, 3).map(permission => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission === '*' ? 'All' : permission}
                      </Badge>
                    ))}
                    {level.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{level.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      {editingLevel && (
        <Dialog open={!!editingLevel} onOpenChange={() => setEditingLevel(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Access Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingLevel.name}
                  onChange={(e) => setEditingLevel(prev => prev ? { ...prev, name: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingLevel.description}
                  onChange={(e) => setEditingLevel(prev => prev ? { ...prev, description: e.target.value } : null)}
                />
              </div>
              <div>
                <Label>Color</Label>
                <Select 
                  value={editingLevel.color} 
                  onValueChange={(value) => setEditingLevel(prev => prev ? { ...prev, color: value } : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${option.value}`}></div>
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => handleUpdateLevel(editingLevel)} className="w-full">
                Update Level
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AccessLevelManager;
