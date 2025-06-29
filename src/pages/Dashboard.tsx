
import React from 'react';
import SystemOverview from '../components/dashboard/SystemOverview';
import { Bot } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Dynamic Background */}
      <div className="fixed inset-0 opacity-5 bg-gradient-to-br from-primary/10 to-accent/10" />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center border border-primary/50 bg-primary/10">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-primary">
                Neural Command Center
              </h1>
              <p className="text-muted-foreground">
                LEX AI Phase 3 - Real-time system overview and autonomous agent monitoring
              </p>
            </div>
          </div>
        </div>
        
        <SystemOverview />
      </div>
    </div>
  );
};

export default Dashboard;
