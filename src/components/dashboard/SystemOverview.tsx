
import React from 'react';
import { useSystemMonitor } from '../../hooks/useSystemMonitor';
import HardwareMetricsGrid from './HardwareMetricsGrid';
import AgentActivityGrid from './AgentActivityGrid';
import HardwareSpecifications from './HardwareSpecifications';
import StorageBreakdown from './StorageBreakdown';
import HardwareStatus from './HardwareStatus';

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

  // Provide proper default values for nested objects with expected properties
  const hardware = systemStatus.hardware || {
    gpu: { model: 'GPU', memory_total: '--', memory_used: '--', utilization: 0, temperature: 0 },
    cpu: { cores: 0, usage: 0, load_average: [0, 0, 0] },
    memory: { total: '--', used: '--', available: '--', usage_percent: 0 },
    disk: { total: '--', used: '--', available: '--', usage_percent: 0 }
  };
  
  const orchestrator = systemStatus.orchestrator || {
    status: 'unknown',
    active_agents: 0,
    total_tasks: 0,
    active_tasks: 0,
    queued_tasks: 0,
    completed_tasks: 0,
    failed_tasks: 0,
    task_workers: 0,
    workflow_workers: 0
  };
  
  const system = systemStatus.system || {
    status: 'unknown',
    uptime: 0,
    version: '--',
    environment: 'unknown'
  };

  return (
    <div className="space-y-6">
      {/* Real Hardware Metrics Grid */}
      <HardwareMetricsGrid hardware={hardware} />

      {/* Agent Activity */}
      <AgentActivityGrid orchestrator={orchestrator} />

      {/* Hardware Specifications */}
      <HardwareSpecifications hardware={hardware} system={system} />

      {/* Storage Breakdown */}
      <StorageBreakdown hardware={hardware} />

      {/* Hardware Status */}
      <HardwareStatus system={system} hardware={hardware} />
    </div>
  );
};

export default SystemOverview;
