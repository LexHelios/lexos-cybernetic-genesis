
import React from 'react';
import { Cpu, Brain, Zap, Settings } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const ModelArsenal = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-cyber-pink/10 to-neural-purple/10"
        style={{
          backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-cyber-pink/50 bg-cyber-pink/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Cpu className="w-6 h-6 text-cyber-pink opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-cyber-pink">
                Model Arsenal
              </h1>
              <p className="text-muted-foreground">
                Advanced AI model deployment and neural architecture management
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Models"
            value="23"
            subtitle="Currently loaded"
            color="cyber"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Total Parameters"
            value="1.7T"
            subtitle="Neural weights"
            color="neural"
            trend="stable"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Inference Speed"
            value="847ms"
            subtitle="Average latency"
            color="electric"
            trend="down"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="GPU Utilization"
            value="89.4%"
            subtitle="Compute efficiency"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30 bg-cyber-pink/5">
            <h2 className="text-xl font-orbitron font-bold text-cyber-pink mb-4">Model Registry</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-cyber-pink" />
                  <span>LEX-GPT-7B</span>
                </div>
                <span className="text-matrix-green">DEPLOYED</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-electric-blue" />
                  <span>Vision-Transformer</span>
                </div>
                <span className="text-electric-blue">LOADING</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-neural-purple" />
                  <span>Audio-Processor</span>
                </div>
                <span className="text-warning-orange">TRAINING</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-neural-purple/30 bg-neural-purple/5">
            <h2 className="text-xl font-orbitron font-bold text-neural-purple mb-4">Architecture Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Language Models</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-cyber-pink rounded-full"></div>
                  </div>
                  <span className="text-sm">12</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Vision Models</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/2 h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">7</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Multimodal</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-1/4 h-full bg-neural-purple rounded-full"></div>
                  </div>
                  <span className="text-sm">4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelArsenal;
