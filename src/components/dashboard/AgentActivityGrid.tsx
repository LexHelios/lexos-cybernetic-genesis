
import React from 'react';
import MetricCard from './MetricCard';

interface AgentActivityGridProps {
  orchestrator: {
    active_agents: number;
    active_tasks: number;
    queued_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    total_tasks: number;
  };
}

const AgentActivityGrid: React.FC<AgentActivityGridProps> = ({ orchestrator }) => {
  return (
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
  );
};

export default AgentActivityGrid;
