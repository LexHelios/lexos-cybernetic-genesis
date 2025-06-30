
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit, Trash2, Users, Shield } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  accessLevel: string;
  avatar?: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@family.com',
    accessLevel: 'admin',
    lastActive: '2 minutes ago',
    status: 'active'
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane@family.com',
    accessLevel: 'admin',
    lastActive: '5 minutes ago',
    status: 'active'
  },
  {
    id: '3',
    name: 'Alice Doe',
    email: 'alice@family.com',
    accessLevel: 'family',
    lastActive: '1 hour ago',
    status: 'active'
  },
  {
    id: '4',
    name: 'Bob Doe',
    email: 'bob@family.com',
    accessLevel: 'child',
    lastActive: '30 minutes ago',
    status: 'active'
  }
];

const ACCESS_LEVEL_COLORS = {
  admin: 'bg-red-500',
  family: 'bg-blue-500',
  child: 'bg-green-500',
  guest: 'bg-gray-500'
};

const UserManagement: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateMember = () => {
    setEditingMember({
      id: '',
      name: '',
      email: '',
      accessLevel: 'family',
      lastActive: 'Never',
      status: 'active'
    });
    setIsDialogOpen(true);
  };

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember({ ...member });
    setIsDialogOpen(true);
  };

  const handleSaveMember = () => {
    if (!editingMember) return;

    if (editingMember.id) {
      // Update existing member
      setFamilyMembers(members => 
        members.map(member => member.id === editingMember.id ? editingMember : member)
      );
    } else {
      // Create new member
      const newMember = {
        ...editingMember,
        id: Date.now().toString()
      };
      setFamilyMembers(members => [...members, newMember]);
    }

    setIsDialogOpen(false);
    setEditingMember(null);
  };

  const handleDeleteMember = (memberId: string) => {
    setFamilyMembers(members => members.filter(member => member.id !== memberId));
  };

  const getAccessLevelDisplay = (level: string) => {
    const displays = {
      admin: { name: 'Administrator', color: 'bg-red-500' },
      family: { name: 'Family Member', color: 'bg-blue-500' },
      child: { name: 'Child', color: 'bg-green-500' },
      guest: { name: 'Guest', color: 'bg-gray-500' }
    };
    return displays[level as keyof typeof displays] || { name: level, color: 'bg-gray-500' };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Family Members</h2>
          <p className="text-muted-foreground">Manage your family members and their access levels</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateMember}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingMember?.id ? 'Edit Family Member' : 'Add Family Member'}
              </DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editingMember.name}
                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingMember.email}
                    onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accessLevel">Access Level</Label>
                  <select
                    id="accessLevel"
                    className="w-full px-3 py-2 border rounded-md"
                    value={editingMember.accessLevel}
                    onChange={(e) => setEditingMember({ ...editingMember, accessLevel: e.target.value })}
                  >
                    <option value="admin">Administrator</option>
                    <option value="family">Family Member</option>
                    <option value="child">Child</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMember}>
                    {editingMember.id ? 'Update' : 'Add'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {familyMembers.map(member => {
          const accessDisplay = getAccessLevelDisplay(member.accessLevel);
          return (
            <Card key={member.id} className="holographic-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditMember(member)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Access Level:</span>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${accessDisplay.color}`}></div>
                    {accessDisplay.name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last Active:</span>
                  <span className="text-sm">{member.lastActive}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default UserManagement;
