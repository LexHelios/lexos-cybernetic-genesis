
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { SmilePlus } from 'lucide-react';

const Index = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-4xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Welcome to NEXUS Genesis
            </h1>
            <SmilePlus className="w-8 h-8 text-yellow-400" />
          </div>
          <p className="text-xl text-muted-foreground">
            Hello, {user?.name || user?.username || 'User'}
          </p>
          <p className="text-muted-foreground">
            Your AI command center is ready. Navigate using the sidebar to manage your agents and systems.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
