
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Shield, Users, Settings } from 'lucide-react';

interface AccessLevel {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  color: string;
}

const DEFAULT_ACCESS_LEVELS: AccessLevel[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access - for parents/guardians',
    permissions: ['system.manage', 'users.manage', 'agents.manage', 'security.manage'],
    userCount: 2,
    color: 'bg-red-500'
  },
  {
    id: 'family',
    name: 'Family Member',
    description: 'Standard access for family members',
    permissions: ['agents.view', 'agents.chat', 'tasks.create', 'dashboard.view'],
    userCount: 3,
    color: 'bg-blue-500'
  },
  {
    id: 'child',
    name: 'Child',
    description: 'Limited access for children with content filtering',
    permissions: ['agents.chat', 'dashboard.view'],
    userCount: 2,
    color: 'bg-green-500'
  },
  {
    id: 'guest',
    name: 'Guest',
    description: 'Temporary access for visitors',
    permissions: ['dashboard.view'],
    userCount: 0,
    color: 'bg-gray-500'
  }
];

const AVAILABLE_PERMISSIONS = [
  { id: 'system.manage', name: 'System Management', description: 'Manage system settings and configuration' },
  { id: 'users.manage', name: 'User Management', description: 'Add, edit, and remove users' },
  { id: 'agents.manage', name: 'Agent Management', description: 'Create and configure AI agents' },
  { id: 'agents.view', name: 'View Agents', description: 'View available AI agents' },
  { id: 'agents.chat', name: 'Chat with Agents', description: 'Interact with AI agents' },
  { id: 'tasks.create', name: 'Create Tasks', description: 'Create and submit tasks to agents' },
  { id: 'tasks.manage', name: 'Manage Tasks', description: 'Manage all system tasks' },
  { id: 'security.manage', name: 'Security Management', description: 'Manage security settings and access control' },
  { id: 'dashboard.view', name: 'View Dashboard', description: 'Access system dashboard' },
  { id: 'files.upload', name: 'File Upload', description: 'Upload files to the system' },
  { id: 'models.manage', name: 'Model Management', description: 'Manage AI models' }
];

const AccessLevelManager: React.FC = () => {
  const [accessLevels, setAccessLevels] = useState<AccessLevel[]>(DEFAULT_ACCESS_LEVELS);
  const [editingLevel, setEditingLevel] = useState<AccessLevel | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateLevel = () => {
    setEditingLevel({
      id: '',
      name: '',
      description: '',
      permissions: [],
      userCount: 0,
      color: 'bg-purple-500'
    });
    setIsDialogOpen(true);
  };

  const handleEditLevel = (level: AccessLevel) => {
    setEditingLevel({ ...level });
    setIsDialogOpen(true);
  };

  const handleSaveLevel = () => {
    if (!editingLevel) return;

    if (editingLevel.id) {
      // Update existing level
      setAccessLevels(levels => 
        levels.map(level => level.id === editingLevel.id ? editingLevel : level)
      );
    } else {
      // Create new level
      const newLevel = {
        ...editingLevel,
        id: editingLevel.name.toLowerCase().replace(/\s+/g, '-')
      };
      setAccessLevels(levels => [...levels, newLevel]);
    }

    setIsDialogOpen(false);
    setEditingLevel(null);
  };

  const handleDeleteLevel = (levelId: string) => {
    if (['admin', 'family', 'child', 'guest'].includes(levelId)) {
      alert('Cannot delete default access levels');
      return;
    }
    setAccessLevels(levels => levels.filter(level => level.id !== levelId));
  };

  const togglePermission = (permissionId: string) => {
    if (!editingLevel) return;
    
    const newPermissions = editingLevel.permissions.includes(permissionId)
      ? editingLevel.permissions.filter(p => p !== permissionId)
      : [...editingLevel.permissions, permissionId];
    
    setEditingLevel({ ...editingLevel, permissions: newPermissions });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Access Levels</h2>
          <p className="text-muted-foreground">Define different access levels for your family members</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateLevel}>
              <Plus className="w-4 h-4 mr-2" />
              Create Level
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingLevel?.id ? 'Edit Access Level' : 'Create Access Level'}
              </DialogTitle>
            </DialogHeader>
            {editingLevel && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={editingLevel.name}
                      onChange={(e) => setEditingLevel({ ...editingLevel, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md"
                      value={editingLevel.color}
                      onChange={(e) => setEditingLevel({ ...editingLevel, color: e.target.value })}
                    >
                      <option value="bg-red-500">Red</option>
                      <option value="bg-blue-500">Blue</option>
                      <option value="bg-green-500">Green</option>
                      <option value="bg-purple-500">Purple</option>
                      <option value="bg-orange-500">Orange</option>
                      <option value="bg-gray-500">Gray</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editingLevel.description}
                    onChange={(e) => setEditingLevel({ ...editingLevel, description: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                    {AVAILABLE_PERMISSIONS.map(permission => (
                      <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{permission.name}</div>
                          <div className="text-sm text-muted-foreground">{permission.description}</div>
                        </div>
                        <Switch
                          checked={editingLevel.permissions.includes(permission.id)}
                          onCheckedChange={() => togglePermission(permission.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveLevel}>
                    {editingLevel.id ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            )}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditLevel(level)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!['admin', 'family', 'child', 'guest'].includes(level.id) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteLevel(level.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">{level.description}</p>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Permissions:</Label>
                <div className="flex flex-wrap gap-2">
                  {level.permissions.map(permission => {
                    const permissionInfo = AVAILABLE_PERMISSIONS.find(p => p.id === permission);
                    return (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permissionInfo?.name || permission}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AccessLevelManager;
