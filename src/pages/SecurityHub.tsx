
import React from 'react';
import { Shield, Lock, AlertTriangle, Eye } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const SecurityHub = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-warning-orange/10 to-primary/10"
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
                backgroundImage: `url('/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png')`,
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
                System security, permissions, and threat monitoring
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
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Active Shields"
            value="17"
            subtitle="Protection layers"
            color="warning"
            trend="stable"
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Blocked Attempts"
            value="1,247"
            subtitle="Last 24h"
            color="warning"
            trend="down"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Security Score"
            value="97.8%"
            subtitle="System integrity"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-warning-orange/30 bg-warning-orange/5">
            <h2 className="text-xl font-orbitron font-bold text-warning-orange mb-4">Security Protocols</h2>
            <div className="space-y-4">
              {[
                { name: "Firewall", status: "active", level: "Maximum" },
                { name: "Encryption", status: "active", level: "AES-256" },
                { name: "Access Control", status: "active", level: "Multi-factor" },
                { name: "Anomaly Detection", status: "active", level: "AI-powered" }
              ].map((protocol, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Lock className="w-4 h-4 text-warning-orange" />
                    <span className="text-sm font-medium">{protocol.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">{protocol.level}</span>
                    <div className="w-3 h-3 bg-matrix-green rounded-full neural-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-primary/30 bg-primary/5">
            <h2 className="text-xl font-orbitron font-bold text-primary mb-4">Threat Monitor</h2>
            <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-primary/20">
              <div className="text-center">
                <Eye className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Real-time Threat Analysis</p>
                <p className="text-sm text-muted-foreground">24/7 security monitoring</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityHub;
