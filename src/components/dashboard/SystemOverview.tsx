
import React from 'react';
import MetricCard from './MetricCard';
import { useSystemMonitor } from '../../hooks/useSystemMonitor';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const SystemOverview = () => {
  const { systemStatus, isLoading, error } = useSystemMonitor();

  // Debug logging
  React.useEffect(() => {
    console.log('SystemOverview - systemStatus:', systemStatus);
    console.log('SystemOverview - isLoading:', isLoading);
    console.log('SystemOverview - error:', error);
  }, [systemStatus, isLoading, error]);

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

  // Provide proper default values for nested objects
  const hardware = systemStatus.hardware || {};
  const orchestrator = systemStatus.orchestrator || {};
  const system = systemStatus.system || {};
  
  const gpu = hardware.gpu || {};
  const cpu = hardware.cpu || {};
  const memory = hardware.memory || {};
  const disk = hardware.disk || {};

  return (
    <div className="space-y-6">
      {/* Real Hardware Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={gpu.model || 'GPU'}
          value={`${gpu.memory_used || '--'} / ${gpu.memory_total || '--'}`}
          subtitle={`${gpu.utilization || '--'}% Utilization • ${gpu.temperature || '--'}°C`}
          trend="stable"
          color="matrix"
          icon="⚡"
          animate={(gpu.utilization || 0) > 50}
        />
        <MetricCard
          title="System Storage"
          value={disk.used || '--'}
          subtitle={`${disk.total || '--'} Total • ${disk.usage_percent || '--'}% Used`}
          trend="stable"
          color="cyber"
          icon="💾"
        />
        <MetricCard
          title="CPU Cores"
          value={(cpu.cores || '--').toString()}
          subtitle={`${cpu.usage || '--'}% Usage • Load: ${cpu.load_average?.[0]?.toFixed(1) || '--'}`}
          trend="stable"
          color="electric"
          icon="🔥"
        />
        <MetricCard
          title="System Memory"
          value={memory.used || '--'}
          subtitle={`${memory.total || '--'} Total • ${memory.usage_percent || '--'}% Used`}
          trend="stable"
          color="neural"
          icon="🧠"
        />
      </div>

      {/* Agent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Agents"
          value={(orchestrator.active_agents ?? 0).toString()}
          subtitle="Neural agents online"
          color="primary"
          icon="🤖"
        />
        <MetricCard
          title="Active Tasks"
          value={(orchestrator.active_tasks ?? 0).toString()}
          subtitle={`${orchestrator.queued_tasks ?? 0} queued`}
          color="matrix"
          icon="⚡"
          animate={(orchestrator.active_tasks || 0) > 0}
        />
        <MetricCard
          title="Completed Tasks"
          value={(orchestrator.completed_tasks ?? 0).toLocaleString()}
          subtitle={`${orchestrator.failed_tasks ?? 0} failed`}
          color="cyber"
          icon="✅"
        />
        <MetricCard
          title="Success Rate"
          value={`${((orchestrator.completed_tasks ?? 0) / (orchestrator.total_tasks || 1) * 100).toFixed(1)}%`}
          subtitle="Task completion rate"
          color="neural"
          icon="🎯"
        />
      </div>

      {/* Hardware Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="holographic-panel p-6 rounded-lg">
          <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
            {gpu.model || 'GPU'} Specifications
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">GPU Model</span>
              <span className="text-matrix-green font-mono">{gpu.model || 'GPU'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">VRAM Total</span>
              <span className="text-matrix-green font-mono">{gpu.memory_total || '--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">VRAM Used</span>
              <span className="text-matrix-green font-mono">{gpu.memory_used || '--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">GPU Utilization</span>
              <span className="text-matrix-green font-mono">{gpu.utilization || '--'}%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Temperature</span>
              <span className="text-matrix-green font-mono">{gpu.temperature || '--'}°C</span>
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
              <span className="text-electric-blue font-mono">{cpu.cores || '--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">System RAM</span>
              <span className="text-electric-blue font-mono">{memory.total || '--'}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
              <span className="font-medium">Storage</span>
              <span className="text-electric-blue font-mono">{disk.total || '--'}</span>
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

      {/* Storage Breakdown */}
      <div className="holographic-panel p-6 rounded-lg">
        <h3 className="text-lg font-orbitron font-bold text-primary mb-4">
          Storage Allocation ({disk.total || '--'})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Used</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Storage Used</span>
                <span className="text-sm font-mono">{disk.used || '--'}</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${disk.usage_percent || 0}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Available</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Free Space</span>
                <span className="text-sm font-mono">{disk.available || '--'}</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-matrix-green h-2 rounded-full" style={{ width: `${100 - (disk.usage_percent || 0)}%` }}></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase">Memory</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">RAM Used</span>
                <span className="text-sm font-mono">{memory.used || '--'}</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div className="bg-cyber-pink h-2 rounded-full" style={{ width: `${memory.usage_percent || 0}%` }}></div>
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
              {system.status?.toUpperCase() || 'UNKNOWN'}
            </div>
            <div className="text-sm text-muted-foreground">System Status</div>
          </div>
          <div className="text-center p-4 bg-muted/10 rounded-lg">
            <div className="text-2xl font-orbitron font-bold text-matrix-green">
              {(gpu.utilization || 0) > 0 ? 'ACTIVE' : 'READY'}
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
