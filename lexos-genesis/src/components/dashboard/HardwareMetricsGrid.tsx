
import React from 'react';
import MetricCard from './MetricCard';

interface HardwareMetricsGridProps {
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
      usage: number;
      load_average: number[];
    };
    memory: {
      total: string;
      used: string;
      usage_percent: number;
    };
    disk: {
      total: string;
      used: string;
      usage_percent: number;
    };
  };
}

const HardwareMetricsGrid: React.FC<HardwareMetricsGridProps> = ({ hardware }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title={hardware.gpu.model || 'GPU'}
        value={`${hardware.gpu.memory_used || '--'} / ${hardware.gpu.memory_total || '--'}`}
        subtitle={`${hardware.gpu.utilization || '--'}% Utilization • ${hardware.gpu.temperature || '--'}°C`}
        trend="stable"
        color="matrix"
        icon="⚡"
        animate={(hardware.gpu.utilization || 0) > 50}
      />
      <MetricCard
        title="System Storage"
        value={hardware.disk.used || '--'}
        subtitle={`${hardware.disk.total || '--'} Total • ${hardware.disk.usage_percent || '--'}% Used`}
        trend="stable"
        color="cyber"
        icon="💾"
      />
      <MetricCard
        title="CPU Cores"
        value={(hardware.cpu.cores || '--').toString()}
        subtitle={`${hardware.cpu.usage || '--'}% Usage • Load: ${hardware.cpu.load_average?.[0]?.toFixed(1) || '--'}`}
        trend="stable"
        color="electric"
        icon="🔥"
      />
      <MetricCard
        title="System Memory"
        value={hardware.memory.used || '--'}
        subtitle={`${hardware.memory.total || '--'} Total • ${hardware.memory.usage_percent || '--'}% Used`}
        trend="stable"
        color="neural"
        icon="🧠"
      />
    </div>
  );
};

export default HardwareMetricsGrid;
