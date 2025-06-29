
import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle, Eye, Activity, Users, Settings, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import SecurityDashboard from '../components/security/SecurityDashboard';
import SecurityLogs from '../components/security/SecurityLogs';
import AccessControl from '../components/security/AccessControl';
import SecurityPolicies from '../components/security/SecurityPolicies';
import ActiveSessions from '../components/security/ActiveSessions';

const SecurityHub = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-warning-orange/10 to-primary/10"
        style={{
          backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-warning-orange/50 bg-warning-orange/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Shield className="w-6 h-6 text-warning-orange opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-warning-orange">
                Security Hub
              </h1>
              <p className="text-muted-foreground">
                System security, permissions, and threat monitoring
              </p>
            </div>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center space-x-2">
              <Lock className="w-4 h-4" />
              <span className="hidden sm:inline">Access Control</span>
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Policies</span>
            </TabsTrigger>
            <TabsTrigger value="sessions" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Sessions</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <SecurityDashboard />
          </TabsContent>

          <TabsContent value="logs" className="space-y-6">
            <SecurityLogs />
          </TabsContent>

          <TabsContent value="access" className="space-y-6">
            <AccessControl />
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <SecurityPolicies />
          </TabsContent>

          <TabsContent value="sessions" className="space-y-6">
            <ActiveSessions />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SecurityHub;
