
import React from 'react';
import { Shield, Lock, Eye, AlertTriangle } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const SecurityHub = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-warning-orange/10 to-cyber-pink/10"
        style={{
          backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center border border-warning-orange/50 bg-warning-orange/10 overflow-hidden"
              style={{
                backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <Shield className="w-6 h-6 text-warning-orange opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-warning-orange">
                Security Hub
              </h1>
              <p className="text-muted-foreground">
                Advanced threat detection and cybersecurity monitoring
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Threat Level"
            value="LOW"
            subtitle="Current status"
            color="matrix"
            trend="stable"
            animate={true}
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Blocked Attacks"
            value="1,247"
            subtitle="Last 24 hours"
            color="warning"
            trend="up"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Firewall Rules"
            value="892"
            subtitle="Active filters"
            color="cyber"
            trend="stable"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Encryption"
            value="AES-256"
            subtitle="Security level"
            color="electric"
            trend="stable"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-warning-orange/30 bg-warning-orange/5">
            <h2 className="text-xl font-orbitron font-bold text-warning-orange mb-4">Security Modules</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Lock className="w-5 h-5 text-matrix-green" />
                  <span>Intrusion Detection</span>
                </div>
                <span className="text-matrix-green">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Eye className="w-5 h-5 text-electric-blue" />
                  <span>Behavioral Analysis</span>
                </div>
                <span className="text-electric-blue">SCANNING</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-warning-orange" />
                  <span>Anomaly Detection</span>
                </div>
                <span className="text-matrix-green">MONITORING</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30 bg-cyber-pink/5">
            <h2 className="text-xl font-orbitron font-bold text-cyber-pink mb-4">Threat Intelligence</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Malware Signatures</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm text-matrix-green">Updated</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>IP Blacklists</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-5/6 h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">247K</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Behavioral Patterns</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-cyber-pink rounded-full"></div>
                  </div>
                  <span className="text-sm">18.9K</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityHub;
