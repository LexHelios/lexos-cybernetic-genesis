
import React from 'react';
import { Settings, Sliders, Database, Server } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const Configuration = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-primary/10 to-matrix-green/10"
        style={{
          backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-primary/50 bg-primary/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Settings className="w-6 h-6 text-primary opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-primary">
                Configuration
              </h1>
              <p className="text-muted-foreground">
                System configuration and parameter management
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Config Files"
            value="23"
            subtitle="Active configs"
            color="primary"
            trend="stable"
            animate={true}
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Parameters"
            value="847"
            subtitle="System settings"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Last Backup"
            value="2h ago"
            subtitle="Configuration"
            color="electric"
            trend="stable"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Sync Status"
            value="100%"
            subtitle="Synchronized"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-primary/30 bg-primary/5">
            <h2 className="text-xl font-orbitron font-bold text-primary mb-4">System Settings</h2>
            <div className="space-y-4">
              {[
                { name: "Neural Processing", value: "High Performance", status: "optimal" },
                { name: "Memory Allocation", value: "Dynamic", status: "optimal" },
                { name: "Network Protocols", value: "Secure Mode", status: "optimal" },
                { name: "Data Retention", value: "30 days", status: "configured" }
              ].map((setting, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Sliders className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">{setting.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">{setting.value}</span>
                    <div className={`w-3 h-3 rounded-full ${setting.status === 'optimal' ? 'bg-matrix-green' : 'bg-electric-blue'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30 bg-matrix-green/5">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4">Environment Status</h2>
            <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-matrix-green/20">
              <div className="text-center">
                <Server className="w-16 h-16 text-matrix-green mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Environment Overview</p>
                <p className="text-sm text-muted-foreground">System health monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
