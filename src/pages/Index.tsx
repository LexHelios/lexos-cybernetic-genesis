
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import FloatingChat from '../components/chat/FloatingChat';
import Dashboard from './Dashboard';
import AgentManagement from './AgentManagement';
import SystemMonitor from './SystemMonitor';

// Create placeholder components for the routes that don't exist yet
const KnowledgeGraph = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Knowledge Graph</h1>
    <p className="text-muted-foreground mt-2">Neural knowledge visualization coming soon...</p>
  </div>
);

const TaskPipeline = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Task Pipeline</h1>
    <p className="text-muted-foreground mt-2">Autonomous task management coming soon...</p>
  </div>
);

const ModelArsenal = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Model Arsenal</h1>
    <p className="text-muted-foreground mt-2">LLM deployment center coming soon...</p>
  </div>
);

const Communications = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Communications</h1>
    <p className="text-muted-foreground mt-2">Agent-to-agent communication mesh coming soon...</p>
  </div>
);

const SecurityHub = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Security Hub</h1>
    <p className="text-muted-foreground mt-2">System security and permissions coming soon...</p>
  </div>
);

const Analytics = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Analytics</h1>
    <p className="text-muted-foreground mt-2">Advanced system analytics coming soon...</p>
  </div>
);

const Configuration = () => (
  <div className="p-6">
    <h1 className="text-2xl font-orbitron font-bold text-primary">Configuration</h1>
    <p className="text-muted-foreground mt-2">System configuration panel coming soon...</p>
  </div>
);

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agents" element={<AgentManagement />} />
            <Route path="/monitor" element={<SystemMonitor />} />
            <Route path="/knowledge" element={<KnowledgeGraph />} />
            <Route path="/tasks" element={<TaskPipeline />} />
            <Route path="/models" element={<ModelArsenal />} />
            <Route path="/comms" element={<Communications />} />
            <Route path="/security" element={<SecurityHub />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/config" element={<Configuration />} />
          </Routes>
        </main>
      </div>
      
      {/* Floating Chat Interface */}
      <FloatingChat />
    </div>
  );
};

export default Index;
