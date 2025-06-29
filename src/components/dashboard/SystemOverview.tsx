
import React from 'react';
import MetricCard from './MetricCard';
import { useSystemMonitor } from '../../hooks/useSystemMonitor';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const SystemOverview = () => {
  const { systemStatus, isLoading, error } = useSystemMonitor();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="holographic-panel p-6 rounded-lg animate-pulse">
              <div className="h-4 bg-primary/20 rounded mb-2"></div>
              <div className="h-8 bg-primary/20 rounded mb-2"></div>
              <div className="h-3 bg-primary/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="holographic-panel p-6 rounded-lg border-red-500/30 bg-red-500/5">
        <h3 className="text-lg font-orbitron font-bold text-red-400 mb-2">
          System Connection Error
        </h3>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  if (!systemStatus) return null;

  const { hardware, orchestrator, system } = systemStatus;

  return (
    <div className="space-y-6">
      {/* Real Hardware Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={hardware.gpu.model}
          value={`${hardware.gpu.memory_used} / ${hardware.gpu.memory_total}`}
          subtitle={`${hardware.gpu.utilization}% Utilization • ${hardware.gpu.temperature}°C`}
          trend="stable"
          color="matrix"
          icon="⚡"
          animate={hardware.gpu.utilization > 50}
        />
        <MetricCard
          title="System Storage"
          value={hardware.disk.used}
          subtitle={`${hardware.disk.total} Total • ${hardware.disk.usage_percent}% Used`}
          trend="stable"
          color="cyber"
          icon="💾"
        />
        <MetricCard
          title="CPU Cores"
          value={hardware.cpu.cores.toString()}
          subtitle={`${hardware.cpu.usage}% Usage • Load: ${hardware.cpu.load_average[0].toFixed(1)}`}
          trend="stable"
          color="electric"
          icon="🔥"
        />
        <MetricCard
          title="System Memory"
          value={hardware.memory.used}
          subtitle={`${hardware.memory.total} Total • ${hardware.memory.usage_percent}% Used`}
          trend="stable"
          color="neural"
          icon="🧠"
        />
      </div>

      {/* Agent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Agents"
          value={orchestrator.active_agents.toString()}
          subtitle="Neural agents online"
          color="primary"
          icon="🤖"
        />
        <MetricCard
          title="Active Tasks"
          value={orchestrator.active_tasks.toString()}
          subtitle={`${orchestrator.queued_tasks} queued`}
          color="matrix"
          icon="⚡"
          animate={orchestrator.active_tasks > 0}
        />
        <MetricCard
          title="Completed Tasks"
          value={orchestrator.completed_tasks.toLocaleString()}
          subtitle={`${orchestrator.failed_tasks} failed`}
          color="cyber"
          icon="✅"
        />
        <MetricCard
          title="Success Rate"
          value={`${((orchestrator.completed_tasks / orchestrator.total_tasks) * 100).toFixed(1)}%`}
          subtitle="Task completion rate"
          color="neural"
          icon="🎯"
        />
      </div>

      {/* Hardware Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            {hardware.gpu.model} Specifications
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">GPU Model</span>
              <span className="text-matrix-green font-mono">{hardware.gpu.model}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">VRAM Total</span>
              <span className="text-matrix-green font-mono">{hardware.gpu.memory_total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">VRAM Used</span>
              <span className="text-matrix-green font-mono">{hardware.gpu.memory_used}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">GPU Utilization</span>
              <span className="text-matrix-green font-mono">{hardware.gpu.utilization}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Temperature</span>
              <span className="text-matrix-green font-mono">{hardware.gpu.temperature}°C</span>
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
              <span className="text-electric-blue font-mono">{hardware.cpu.cores}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">System RAM</span>
              <span className="text-electric-blue font-mono">{hardware.memory.total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Storage</span>
              <span className="text-electric-blue font-mono">{hardware.disk.total}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">System Status</span>
              <span className="text-electric-blue font-mono">{system.status.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Version</span>
              <span className="text-electric-blue font-mono">{system.version}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown */}
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          Storage Allocation ({hardware.disk.total})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Used</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Storage Used</span>
                <span className="text-sm font-mono">{hardware.disk.used}</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${hardware.disk.usage_percent}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Available</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Free Space</span>
                <span className="text-sm font-mono">{hardware.disk.available}</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-matrix-green h-2 rounded-full" style={{ width: `${100 - hardware.disk.usage_percent}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Memory</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">RAM Used</span>
                <span className="text-sm font-mono">{hardware.memory.used}</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-cyber-pink h-2 rounded-full" style={{ width: `${hardware.memory.usage_percent}%` }}></div>
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
            <div className="text-2xl font-orbitron font-bold text-matrix-green">
              {system.status.toUpperCase()}
            </div>
            <div className="text-sm text-muted-foreground">System Status</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-orbitron font-bold text-matrix-green">
              {hardware.gpu.utilization > 0 ? 'ACTIVE' : 'READY'}
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
    </div>
  );
};

export default SystemOverview;
