
import React from 'react';

interface HardwareSpecificationsProps {
  hardware: {
    gpu: {
      model: string;
      memory_total: string;
      memory_used: string;
      utilization: number;
      temperature: number;
    };
    cpu: {
      cores: number;
    };
    memory: {
      total: string;
    };
    disk: {
      total: string;
    };
  };
  system: {
    status: string;
    version: string;
  };
}

const HardwareSpecifications: React.FC<HardwareSpecificationsProps> = ({ hardware, system }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          {hardware.gpu.model || 'GPU'} Specifications
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">GPU Model</span>
            <span className="text-matrix-green font-mono">{hardware.gpu.model || 'GPU'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">VRAM Total</span>
            <span className="text-matrix-green font-mono">{hardware.gpu.memory_total || '--'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">VRAM Used</span>
            <span className="text-matrix-green font-mono">{hardware.gpu.memory_used || '--'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">GPU Utilization</span>
            <span className="text-matrix-green font-mono">{hardware.gpu.utilization || '--'}%</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">Temperature</span>
            <span className="text-matrix-green font-mono">{hardware.gpu.temperature || '--'}°C</span>
          </div>
        </div>
      </div>

      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          System Configuration
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">CPU Cores</span>
            <span className="text-electric-blue font-mono">{hardware.cpu.cores || '--'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">System RAM</span>
            <span className="text-electric-blue font-mono">{hardware.memory.total || '--'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">Storage</span>
            <span className="text-electric-blue font-mono">{hardware.disk.total || '--'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">System Status</span>
            <span className="text-electric-blue font-mono">{system.status?.toUpperCase() || 'UNKNOWN'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
            <span className="font-medium">Version</span>
            <span className="text-electric-blue font-mono">{system.version || '--'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HardwareSpecifications;
