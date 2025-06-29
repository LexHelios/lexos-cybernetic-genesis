
import React from 'react';
import { BarChart3, TrendingUp, PieChart, LineChart } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Data Points"
            value="2.4M"
            subtitle="Collected today"
            color="electric"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Processing Speed"
            value="847k"
            subtitle="Records/sec"
            color="cyber"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Accuracy Rate"
            value="99.3%"
            subtitle="Model precision"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Insights Generated"
            value="156"
            subtitle="This hour"
            color="neural"
            trend="up"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Performance Metrics</h2>
            <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-electric-blue/20">
              <div className="text-center">
                <LineChart className="w-16 h-16 text-electric-blue mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Real-time Performance Chart</p>
                <p className="text-sm text-muted-foreground">System metrics visualization</p>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-neural-purple/30 bg-neural-purple/5">
            <h2 className="text-xl font-orbitron font-bold text-neural-purple mb-4">Resource Distribution</h2>
            <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-neural-purple/20">
              <div className="text-center">
                <PieChart className="w-16 h-16 text-neural-purple mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Resource Allocation Chart</p>
                <p className="text-sm text-muted-foreground">Usage breakdown analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
