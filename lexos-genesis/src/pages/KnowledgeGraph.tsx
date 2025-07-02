
import React from 'react';
import { Network, Database, Brain, Zap } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const KnowledgeGraph = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-neural-purple/10 to-matrix-green/10"
        style={{
          backgroundImage: `url('/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png')`,
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
                backgroundImage: `url('/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Network className="w-6 h-6 text-neural-purple opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-neural-purple">
                Knowledge Graph
              </h1>
              <p className="text-muted-foreground">
                Neural network knowledge mapping and semantic relationship analysis
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Knowledge Nodes"
            value="2.4M"
            subtitle="Connected entities"
            color="neural"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Relationships"
            value="8.7M"
            subtitle="Semantic links"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Query Speed"
            value="0.12ms"
            subtitle="Average lookup"
            color="electric"
            trend="down"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Accuracy Rate"
            value="99.8%"
            subtitle="Knowledge confidence"
            color="cyber"
            trend="stable"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-neural-purple/30 bg-neural-purple/5">
            <h2 className="text-xl font-orbitron font-bold text-neural-purple mb-4">Graph Analytics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Brain className="w-5 h-5 text-neural-purple" />
                  <span>Semantic Processing</span>
                </div>
                <span className="text-neural-purple">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Database className="w-5 h-5 text-matrix-green" />
                  <span>Knowledge Indexing</span>
                </div>
                <span className="text-matrix-green">Optimizing</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-electric-blue" />
                  <span>Real-time Updates</span>
                </div>
                <span className="text-electric-blue">Streaming</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30 bg-matrix-green/5">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4">Network Topology</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Core Concepts</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-5/6 h-full bg-neural-purple rounded-full"></div>
                  </div>
                  <span className="text-sm">2.4M</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Contextual Links</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm">8.7M</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Inference Paths</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-2/3 h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">1.2M</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
