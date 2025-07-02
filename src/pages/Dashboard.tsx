import React from 'react';
import SystemOverview from '../components/dashboard/SystemOverview';
import { Bot } from 'lucide-react';
import { VoiceCommandPanel } from '../components/voice/VoiceCommandPanel';
import { AutoRoutingStats } from '../components/dashboard/AutoRoutingStats';

const Dashboard = () => {
  return (
    <div className="p-6 relative min-h-screen" style={{ pointerEvents: 'auto' }}>
      {/* Dynamic Background with LEX GPT Image */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-primary/10 to-accent/10"
        style={{
          backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          pointerEvents: 'none'
        }}
      />
      
      <div className="relative z-10" style={{ pointerEvents: 'auto' }}>
        {/* Big Yellow Smiley Face - Verification Marker */}
        <div className="absolute top-4 right-4 text-8xl animate-bounce z-50">
          😊
        </div>
        
        {/* Additional Verification Banner */}
        <div className="bg-yellow-500 text-black p-4 rounded-lg mb-4 text-center font-bold text-2xl animate-pulse">
          🎉 CLAUDE'S UPDATE IS LIVE! - {new Date().toLocaleString()} 🎉
        </div>
        
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-primary/50 bg-primary/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {/* Remove icon to show background image clearly */}
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SystemOverview />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <AutoRoutingStats />
            <div className="holographic-panel p-1 rounded-lg">
              <VoiceCommandPanel />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
