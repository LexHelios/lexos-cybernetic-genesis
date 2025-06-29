
import React from 'react';
import { Monitor, Cpu, HardDrive, Wifi } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const SystemMonitor = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-warning-orange/10 to-electric-blue/10"
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
                backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Monitor className="w-6 h-6 text-warning-orange opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-warning-orange">
                System Monitor
              </h1>
              <p className="text-muted-foreground">
                Real-time infrastructure monitoring and performance analytics
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="CPU Usage"
            value="67.3%"
            subtitle="H100 Clusters"
            color="warning"
            trend="stable"
            animate={true}
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Memory"
            value="2.1TB"
            subtitle="Available RAM"
            color="electric"
            trend="down"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Storage"
            value="847TB"
            subtitle="Free space"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Network"
            value="42.1Gb/s"
            subtitle="Throughput"
            color="cyber"
            trend="up"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-warning-orange/30 bg-warning-orange/5">
            <h2 className="text-xl font-orbitron font-bold text-warning-orange mb-4">Hardware Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Cpu className="w-5 h-5 text-warning-orange" />
                  <span>GPU Clusters</span>
                </div>
                <span className="text-matrix-green">Optimal</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <HardDrive className="w-5 h-5 text-electric-blue" />
                  <span>Storage Arrays</span>
                </div>
                <span className="text-matrix-green">Healthy</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wifi className="w-5 h-5 text-cyber-pink" />
                  <span>Network Links</span>
                </div>
                <span className="text-matrix-green">Active</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Compute Load</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-warning-orange rounded-full"></div>
                  </div>
                  <span className="text-sm">67%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Memory Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">52%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>I/O Operations</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm">78%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemMonitor;
