
import React, { useState, useEffect } from 'react';
import { Network, Database, Share2, Brain } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import KnowledgeGraph2D from '../components/knowledge/KnowledgeGraph2D';
import { apiClient } from '../services/api';

const KnowledgeGraph = () => {
  const [statistics, setStatistics] = useState<any>(null);
  
  useEffect(() => {
    loadStatistics();
  }, []);
  
  const loadStatistics = async () => {
    try {
      const response = await apiClient.getKnowledgeGraph({ limit: 1 });
      setStatistics(response.statistics);
    } catch (error) {
      console.error('Failed to load graph statistics:', error);
    }
  };
  
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
            value={statistics?.nodeCount?.toLocaleString() || '0'}
            subtitle="Active concepts"
            color="neural"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Connections"
            value={statistics?.edgeCount?.toLocaleString() || '0'}
            subtitle="Semantic links"
            color="electric"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Agent Nodes"
            value={statistics?.nodeTypes?.agent?.toLocaleString() || '0'}
            subtitle="Active agents"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Memory Nodes"
            value={statistics?.nodeTypes?.memory?.toLocaleString() || '0'}
            subtitle="Stored memories"
            color="cyber"
            trend="up"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
        </div>

        <div className="holographic-panel rounded-lg border border-neural-purple/30 bg-neural-purple/5 overflow-hidden" style={{ height: 'calc(100vh - 320px)' }}>
          <KnowledgeGraph2D />
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
