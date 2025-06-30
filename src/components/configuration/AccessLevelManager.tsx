
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Plus } from 'lucide-react';

interface AccessLevel {
  id: string;
  name: string;
  description: string;
  userCount: number;
  color: string;
}

const DEFAULT_ACCESS_LEVELS: AccessLevel[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access - for parents/guardians',
    userCount: 2,
    color: 'bg-red-500'
  },
  {
    id: 'family',
    name: 'Family Member',
    description: 'Standard access for family members',
    userCount: 3,
    color: 'bg-blue-500'
  },
  {
    id: 'child',
    name: 'Child',
    description: 'Limited access for children with content filtering',
    userCount: 2,
    color: 'bg-green-500'
  }
];

const AccessLevelManager: React.FC = () => {
  const [accessLevels] = useState<AccessLevel[]>(DEFAULT_ACCESS_LEVELS);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Access Levels</h2>
          <p className="text-muted-foreground">Define different access levels for your family members</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Level
        </Button>
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
                <Badge variant="secondary">
                  <Users className="w-3 h-3 mr-1" />
                  {level.userCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{level.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AccessLevelManager;
