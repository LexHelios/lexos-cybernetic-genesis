
import React from 'react';
import { Network, Database, Share2, Brain } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const KnowledgeGraph = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-neural-purple/10 to-electric-blue/10"
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
                backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
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
                Neural knowledge visualization and semantic mapping
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Knowledge Nodes"
            value="12,847"
            subtitle="Active concepts"
            color="neural"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Connections"
            value="45,293"
            subtitle="Semantic links"
            color="electric"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Embeddings"
            value="8.2M"
            subtitle="Vector dimensions"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Query Speed"
            value="0.3ms"
            subtitle="Average latency"
            color="cyber"
            trend="down"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
        </div>

        <div className="holographic-panel p-6 rounded-lg border border-neural-purple/30 bg-neural-purple/5">
          <h2 className="text-xl font-orbitron font-bold text-neural-purple mb-4">Knowledge Network</h2>
          <div className="flex items-center justify-center h-64 bg-black/20 rounded-lg border border-neural-purple/20">
            <div className="text-center">
              <Brain className="w-16 h-16 text-neural-purple mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">3D Knowledge Graph Visualization</p>
              <p className="text-sm text-muted-foreground">Interactive neural network mapping</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
