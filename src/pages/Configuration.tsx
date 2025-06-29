
import React from 'react';
import { Settings, Sliders, Wrench, Cog } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const Configuration = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-neural-purple/10 to-warning-orange/10"
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
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-neural-purple/50 bg-neural-purple/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Settings className="w-6 h-6 text-neural-purple opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-neural-purple">
                Configuration
              </h1>
              <p className="text-muted-foreground">
                System parameters and neural network configuration management
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Config Files"
            value="342"
            subtitle="Active settings"
            color="neural"
            trend="stable"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Parameters"
            value="1.7K"
            subtitle="System variables"
            color="electric"
            trend="up"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Profiles"
            value="23"
            subtitle="Config templates"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Updates"
            value="7"
            subtitle="Pending changes"
            color="warning"
            trend="down"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-neural-purple/30 bg-neural-purple/5">
            <h2 className="text-xl font-orbitron font-bold text-neural-purple mb-4">System Configuration</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Sliders className="w-5 h-5 text-neural-purple" />
                  <span>Neural Parameters</span>
                </div>
                <span className="text-matrix-green">OPTIMIZED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Wrench className="w-5 h-5 text-electric-blue" />
                  <span>Hardware Config</span>
                </div>
                <span className="text-electric-blue">TUNED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Cog className="w-5 h-5 text-cyber-pink" />
                  <span>Network Settings</span>
                </div>
                <span className="text-matrix-green">ACTIVE</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Performance Tuning</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Learning Rate</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/3 h-full bg-neural-purple rounded-full"></div>
                  </div>
                  <span className="text-sm">0.001</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Batch Size</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">512</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>GPU Memory</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm">80GB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;
