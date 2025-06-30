
import React, { useState } from 'react';
import { Settings, Users, Shield, Key, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AccessLevelManager from '../components/configuration/AccessLevelManager';
import UserManagement from '../components/configuration/UserManagement';
import SecuritySettings from '../components/configuration/SecuritySettings';

const Configuration = () => {
  const [activeTab, setActiveTab] = useState('access-levels');

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            System Configuration
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage access levels and system settings for your family
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="access-levels" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Access Levels
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Family Members
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="access-levels" className="space-y-6">
          <AccessLevelManager />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuration;
