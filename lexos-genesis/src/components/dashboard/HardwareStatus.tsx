
import React from 'react';

interface HardwareStatusProps {
  system: {
    status: string;
  };
  hardware: {
    gpu: {
      utilization: number;
    };
  };
}

const HardwareStatus: React.FC<HardwareStatusProps> = ({ system, hardware }) => {
  return (
    <div className="holographic-panel p-6 rounded-lg">
      <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
        Hardware Status
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-muted/10 rounded-lg">
          <div className="text-2xl font-orbitron font-bold text-matrix-green">
            {system.status?.toUpperCase() || 'UNKNOWN'}
          </div>
          <div className="text-sm text-muted-foreground">System Status</div>
        </div>
        <div className="text-center p-4 bg-muted/10 rounded-lg">
          <div className="text-2xl font-orbitron font-bold text-matrix-green">
            {(hardware.gpu.utilization || 0) > 0 ? 'ACTIVE' : 'READY'}
          </div>
          <div className="text-sm text-muted-foreground">GPU Status</div>
        </div>
        <div className="text-center p-4 bg-muted/10 rounded-lg">
          <div className="text-2xl font-orbitron font-bold text-matrix-green">ONLINE</div>
          <div className="text-sm text-muted-foreground">Agent Network</div>
        </div>
        <div className="text-center p-4 bg-muted/10 rounded-lg">
          <div className="text-2xl font-orbitron font-bold text-matrix-green">OPTIMAL</div>
          <div className="text-sm text-muted-foreground">Performance</div>
        </div>
      </div>
    </div>
  );
};

export default HardwareStatus;
