
import React from 'react';
import SystemOverview from '../components/dashboard/SystemOverview';

const Dashboard = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Dynamic Background */}
      <div 
        className="fixed inset-0 opacity-5"
        style={{
          backgroundImage: `url('/lovable-uploads/af8c7339-edc2-45c1-a12a-3b489ce8310e.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          filter: 'blur(3px)'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-primary/50 bg-black/80">
              <img 
                src="/lovable-uploads/29134d57-1699-4fbb-8ef6-187f4c30655e.png" 
                alt="Neural Command"
                className="w-full h-full object-cover opacity-90"
              />
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
