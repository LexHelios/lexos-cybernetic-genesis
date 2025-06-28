
import React from 'react';
import SystemOverview from '../components/dashboard/SystemOverview';

const Dashboard = () => {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron font-bold text-primary mb-2">
          Neural Command Center
        </h1>
        <p className="text-muted-foreground">
          LEX AI Phase 3 - Real-time system overview and autonomous agent monitoring
        </p>
      </div>
      
      <SystemOverview />
    </div>
  );
};

export default Dashboard;
