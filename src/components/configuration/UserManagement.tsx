
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  accessLevel: string;
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
    accessLevel: 'family',
    lastActive: '1 hour ago',
    status: 'active'
  }
];

const UserManagement: React.FC = () => {
  const [familyMembers] = useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Family Members</h2>
          <p className="text-muted-foreground">Manage your family members and their access levels</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {familyMembers.map(member => (
          <Card key={member.id} className="holographic-panel">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
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
                  <Button size="sm" variant="ghost">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="ghost">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Access Level:</span>
                <Badge variant="secondary">{member.accessLevel}</Badge>
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
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
