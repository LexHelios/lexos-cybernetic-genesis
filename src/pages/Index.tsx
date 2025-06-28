
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import Dashboard from './Dashboard';
import AgentManagement from './AgentManagement';
import SystemMonitor from './SystemMonitor';

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
            <Route path="/knowledge" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Knowledge Graph</h1><p className="text-muted-foreground mt-2">Neural knowledge visualization coming soon...</p></div>} />
            <Route path="/tasks" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Task Pipeline</h1><p className="text-muted-foreground mt-2">Autonomous task management coming soon...</p></div>} />
            <Route path="/models" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Model Arsenal</h1><p className="text-muted-foreground mt-2">LLM deployment center coming soon...</p></div>} />
            <Route path="/comms" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Communications</h1><p className="text-muted-foreground mt-2">Agent-to-agent communication mesh coming soon...</p></div>} />
            <Route path="/security" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Security Hub</h1><p className="text-muted-foreground mt-2">System security and permissions coming soon...</p></div>} />
            <Route path="/analytics" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Analytics</h1><p className="text-muted-foreground mt-2">Advanced system analytics coming soon...</p></div>} />
            <Route path="/config" element={<div className="p-6"><h1 className="text-2xl font-orbitron font-bold text-primary">Configuration</h1><p className="text-muted-foreground mt-2">System configuration panel coming soon...</p></div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Index;
