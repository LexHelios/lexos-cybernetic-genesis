
import React from 'react';
import { MessageSquare, Radio, Satellite, Signal } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const Communications = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-electric-blue/10 to-cyber-pink/10"
        style={{
          backgroundImage: `url('/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-electric-blue/50 bg-electric-blue/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <MessageSquare className="w-6 h-6 text-electric-blue opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-electric-blue">
                Communications
              </h1>
              <p className="text-muted-foreground">
                Neural network communication protocols and data transmission
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Channels"
            value="247"
            subtitle="Communication links"
            color="electric"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Messages/sec"
            value="18.7K"
            subtitle="Throughput rate"
            color="cyber"
            trend="stable"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Latency"
            value="0.8ms"
            subtitle="Average delay"
            color="matrix"
            trend="down"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Bandwidth"
            value="97.2%"
            subtitle="Utilization"
            color="neural"
            trend="up"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Protocol Status</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Radio className="w-5 h-5 text-electric-blue" />
                  <span>Neural Mesh</span>
                </div>
                <span className="text-matrix-green">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Satellite className="w-5 h-5 text-cyber-pink" />
                  <span>Quantum Link</span>
                </div>
                <span className="text-matrix-green">SYNCED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Signal className="w-5 h-5 text-neural-purple" />
                  <span>Data Stream</span>
                </div>
                <span className="text-matrix-green">FLOWING</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30 bg-cyber-pink/5">
            <h2 className="text-xl font-orbitron font-bold text-cyber-pink mb-4">Traffic Analysis</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Agent-to-Agent</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">74%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>System Commands</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/5 h-full bg-cyber-pink rounded-full"></div>
                  </div>
                  <span className="text-sm">18%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Data Sync</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/12 h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm">8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communications;
