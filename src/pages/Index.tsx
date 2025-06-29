
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import FloatingChat from '../components/chat/FloatingChat';
import Dashboard from './Dashboard';
import AgentManagement from './AgentManagement';
import SystemMonitor from './SystemMonitor';
import KnowledgeGraph from './KnowledgeGraph';
import TaskPipeline from './TaskPipeline';
import ModelArsenal from './ModelArsenal';
import Communications from './Communications';
import SecurityHub from './SecurityHub';
import Analytics from './Analytics';
import Configuration from './Configuration';
import UserSettings from './UserSettings';

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
            <Route path="/settings" element={<UserSettings />} />
          </Routes>
        </main>
      </div>
      
      {/* Floating Chat Interface */}
      <FloatingChat />
    </div>
  );
};

export default Index;
