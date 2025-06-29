
import React from 'react';
import { BarChart3 } from 'lucide-react';
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

const Analytics = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-electric-blue/10 to-neural-purple/10"
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
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-electric-blue/50 bg-electric-blue/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <BarChart3 className="w-6 h-6 text-electric-blue opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-electric-blue">
                Analytics
              </h1>
              <p className="text-muted-foreground">
                Advanced system analytics and performance insights
              </p>
            </div>
          </div>
        </div>
        
        <AnalyticsDashboard />
      </div>
    </div>
  );
};

export default Analytics;
