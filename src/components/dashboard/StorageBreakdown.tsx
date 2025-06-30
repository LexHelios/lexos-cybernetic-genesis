
import React from 'react';

interface StorageBreakdownProps {
  hardware: {
    disk: {
      total: string;
      used: string;
      available: string;
      usage_percent: number;
    };
    memory: {
      used: string;
      usage_percent: number;
    };
  };
}

const StorageBreakdown: React.FC<StorageBreakdownProps> = ({ hardware }) => {
  return (
    <div className="holographic-panel p-6 rounded-lg">
      <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
        Storage Allocation ({hardware.disk.total || '--'})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase">Used</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Storage Used</span>
              <span className="text-sm font-mono">{hardware.disk.used || '--'}</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{ width: `${hardware.disk.usage_percent || 0}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase">Available</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Free Space</span>
              <span className="text-sm font-mono">{hardware.disk.available || '--'}</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <div className="bg-matrix-green h-2 rounded-full" style={{ width: `${100 - (hardware.disk.usage_percent || 0)}%` }}></div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase">Memory</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">RAM Used</span>
              <span className="text-sm font-mono">{hardware.memory.used || '--'}</span>
            </div>
            <div className="w-full bg-muted/20 rounded-full h-2">
              <div className="bg-cyber-pink h-2 rounded-full" style={{ width: `${hardware.memory.usage_percent || 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageBreakdown;
