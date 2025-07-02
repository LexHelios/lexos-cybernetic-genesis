
import React from 'react';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const Analytics = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-matrix-green/10 to-neural-purple/10"
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
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-matrix-green/50 bg-matrix-green/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <BarChart3 className="w-6 h-6 text-matrix-green opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-matrix-green">
                Analytics
              </h1>
              <p className="text-muted-foreground">
                Advanced data analytics and performance intelligence
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Data Points"
            value="47.2M"
            subtitle="Processed today"
            color="matrix"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Accuracy"
            value="99.7%"
            subtitle="Model precision"
            color="electric"
            trend="stable"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Predictions"
            value="1.8K/sec"
            subtitle="Inference rate"
            color="cyber"
            trend="up"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Insights"
            value="247"
            subtitle="Generated"
            color="neural"
            trend="up"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30 bg-matrix-green/5">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4">Data Processing</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-5 h-5 text-matrix-green" />
                  <span>Real-time Analysis</span>
                </div>
                <span className="text-matrix-green">RUNNING</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <PieChart className="w-5 h-5 text-electric-blue" />
                  <span>Pattern Recognition</span>
                </div>
                <span className="text-electric-blue">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-cyber-pink" />
                  <span>Predictive Modeling</span>
                </div>
                <span className="text-cyber-pink">LEARNING</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Performance Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Processing Speed</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-5/6 h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm">47.2M/day</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Model Accuracy</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">99.7%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Data Quality</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-cyber-pink rounded-full"></div>
                  </div>
                  <span className="text-sm">96.3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
