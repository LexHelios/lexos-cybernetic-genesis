
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Agents from './pages/Agents';
import AgentManagement from './pages/AgentManagement';
import Configuration from './pages/Configuration';
import Chat from './pages/Chat';
import Login from './pages/Login';
import ConnectionStatus from './components/system/ConnectionStatus';
import FloatingChat from './components/chat/FloatingChat';
import { useAutoRecovery } from './hooks/useAutoRecovery';

function App() {
  // Initialize auto-recovery system
  useAutoRecovery();

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Connection Status - Always visible */}
        <ConnectionStatus className="fixed top-4 right-4 z-50" />
        
        {/* Floating Chat - Always available */}
        <FloatingChat />
        
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="agents" element={<Agents />} />
            <Route path="agent-management" element={<AgentManagement />} />
            <Route path="chat" element={<Chat />} />
            <Route path="configuration" element={<Configuration />} />
          </Route>
        </Routes>
        <Toaster />
      </div>
    </Router>
  );
}

export default App;
