
import React from 'react';
import MetricCard from './MetricCard';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SystemOverview = () => {
  return (
    <div className="space-y-6">
      {/* Real Hardware Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="H100-SXM5-80GB"
          value="80GB"
          subtitle="VRAM Available"
          trend="stable"
          color="matrix"
          icon="⚡"
        />
        <MetricCard
          title="System Storage"
          value="2.3TB"
          subtitle="NVME SSD"
          trend="stable"
          color="cyber"
          icon="💾"
        />
        <MetricCard
          title="CPU Cores"
          value="32"
          subtitle="vCPUs Active"
          trend="stable"
          color="electric"
          icon="🔥"
        />
        <MetricCard
          title="System Memory"
          value="64GB"
          subtitle="DDR5 RAM"
          trend="stable"
          color="neural"
          icon="🧠"
        />
      </div>

      {/* Hardware Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            H100 GPU Specifications
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">GPU Model</span>
              <span className="text-matrix-green font-mono">H100-SXM5-80GB</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">VRAM</span>
              <span className="text-matrix-green font-mono">80 GB HBM3</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">CUDA Cores</span>
              <span className="text-matrix-green font-mono">16,896</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Tensor Cores</span>
              <span className="text-matrix-green font-mono">528 (4th Gen)</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Memory Bandwidth</span>
              <span className="text-matrix-green font-mono">3.35 TB/s</span>
            </div>
          </div>
        </div>

        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            System Configuration
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">CPU</span>
              <span className="text-electric-blue font-mono">32 vCPUs</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">System RAM</span>
              <span className="text-electric-blue font-mono">64 GB</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Storage</span>
              <span className="text-electric-blue font-mono">2.3 TB NVME</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Architecture</span>
              <span className="text-electric-blue font-mono">Hopper</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Compute Capability</span>
              <span className="text-electric-blue font-mono">9.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          Storage Allocation (2.3TB NVME)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">System</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">OS & System</span>
                <span className="text-sm font-mono">~50GB</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '2.2%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Models</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">LLM Storage</span>
                <span className="text-sm font-mono">~1.8TB</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-matrix-green h-2 rounded-full" style={{ width: '78%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Available</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Free Space</span>
                <span className="text-sm font-mono">~450GB</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-cyber-pink h-2 rounded-full" style={{ width: '19.8%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware Status */}
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          Hardware Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-orbitron font-bold text-matrix-green">ONLINE</div>
            <div className="text-sm text-muted-foreground">H100 GPU</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-orbitron font-bold text-matrix-green">READY</div>
            <div className="text-sm text-muted-foreground">CUDA Runtime</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-orbitron font-bold text-matrix-green">ACTIVE</div>
            <div className="text-sm text-muted-foreground">NVME Storage</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-orbitron font-bold text-matrix-green">OPTIMAL</div>
            <div className="text-sm text-muted-foreground">System RAM</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemOverview;
