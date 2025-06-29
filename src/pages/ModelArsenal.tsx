
import React from 'react';
import { Cpu, Zap, Database, Activity } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const ModelArsenal = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-cyber-pink/10 to-warning-orange/10"
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
                backgroundImage: `url('/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png')`,
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
                LLM deployment center and model management
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Models"
            value="12"
            subtitle="Deployed"
            color="cyber"
            trend="stable"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="GPU Memory"
            value="89.2GB"
            subtitle="In use"
            color="warning"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Inference Speed"
            value="2.4k"
            subtitle="Tokens/sec"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Model Accuracy"
            value="94.7%"
            subtitle="Average score"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            { name: "GPT-4 Turbo", status: "active", load: 78, type: "Language Model" },
            { name: "Claude-3 Opus", status: "active", load: 45, type: "Reasoning Model" },
            { name: "Llama-2 70B", status: "standby", load: 12, type: "Open Source" },
            { name: "Mistral 7B", status: "active", load: 89, type: "Efficiency Model" },
            { name: "CodeLlama", status: "active", load: 34, type: "Code Generation" },
            { name: "Stable Diffusion", status: "standby", load: 5, type: "Image Generation" }
          ].map((model, index) => (
            <div key={index} className="holographic-panel p-6 rounded-lg border border-cyber-pink/30 bg-cyber-pink/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-orbitron font-bold text-cyber-pink">{model.name}</h3>
                  <p className="text-sm text-muted-foreground">{model.type}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${model.status === 'active' ? 'bg-matrix-green neural-pulse' : 'bg-warning-orange'}`} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Load</span>
                  <span className="text-sm font-medium text-cyber-pink">{model.load}%</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyber-pink transition-all duration-500"
                    style={{ width: `${model.load}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Status: {model.status}</span>
                  <span>{model.status === 'active' ? 'Online' : 'Standby'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModelArsenal;
