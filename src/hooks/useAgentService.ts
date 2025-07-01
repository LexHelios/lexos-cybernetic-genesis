import { useState, useEffect, useCallback } from 'react';
import { agentService, Agent, TaskResult } from '../services/agentService';
import { useToast } from './use-toast';

export function useAgentService() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const { toast } = useToast();

  // Initialize WebSocket connection
  useEffect(() => {
    agentService.connectWebSocket();

    // Set up message handlers
    agentService.onMessage('agent_status_changed', (data) => {
      setAgents(prev => prev.map(agent => 
        agent.id === data.agentId 
          ? { ...agent, status: data.status }
          : agent
      ));
    });

    agentService.onMessage('agent_metrics_updated', (data) => {
      setAgents(prev => prev.map(agent => 
        agent.id === data.agentId 
          ? { ...agent, metrics: data.metrics }
          : agent
      ));
    });

    agentService.onMessage('all_agents_status', (data) => {
      setAgents(data.agents);
    });

    agentService.onMessage('agent_task_started', (data) => {
      toast({
        title: `Task Started`,
        description: `Agent ${data.agentId} started ${data.task.type}`,
      });
    });

    agentService.onMessage('agent_task_completed', (data) => {
      toast({
        title: `Task Completed`,
        description: `Agent ${data.agentId} completed ${data.task.type}`,
        variant: 'default',
      });
    });

    agentService.onMessage('agent_task_failed', (data) => {
      toast({
        title: `Task Failed`,
        description: `Agent ${data.agentId} failed ${data.task.type}: ${data.task.error}`,
        variant: 'destructive',
      });
    });

    // Load initial data
    loadAgents();
    loadSystemStatus();

    return () => {
      agentService.disconnect();
    };
  }, [toast]);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const agentList = await agentService.getAllAgents();
      setAgents(agentList);
    } catch (error) {
      console.error('Failed to load agents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agents',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadSystemStatus = useCallback(async () => {
    try {
      const status = await agentService.getSystemStatus();
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  }, []);

  const executeTask = useCallback(async (agentId: string, task: any): Promise<TaskResult> => {
    try {
      const result = await agentService.executeTask(agentId, task);
      return result;
    } catch (error: any) {
      toast({
        title: 'Task Execution Failed',
        description: error.message || 'Failed to execute task',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const routeTask = useCallback(async (message: string, context?: any): Promise<TaskResult> => {
    try {
      const result = await agentService.routeTask(message, context);
      return result;
    } catch (error: any) {
      toast({
        title: 'Task Routing Failed',
        description: error.message || 'Failed to route task',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast]);

  const controlAgent = useCallback(async (agentId: string, action: 'pause' | 'resume' | 'restart') => {
    try {
      const result = await agentService.controlAgent(agentId, action);
      toast({
        title: 'Agent Control',
        description: result.message,
      });
      // Reload agents to get updated status
      await loadAgents();
      return result;
    } catch (error: any) {
      toast({
        title: 'Control Failed',
        description: error.message || `Failed to ${action} agent`,
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast, loadAgents]);

  const switchModel = useCallback(async (agentId: string, model: string) => {
    try {
      const result = await agentService.switchModel(agentId, model);
      toast({
        title: 'Model Switched',
        description: result.message,
      });
      await loadAgents();
      return result;
    } catch (error: any) {
      toast({
        title: 'Switch Failed',
        description: error.message || 'Failed to switch model',
        variant: 'destructive',
      });
      throw error;
    }
  }, [toast, loadAgents]);

  return {
    agents,
    loading,
    systemStatus,
    executeTask,
    routeTask,
    controlAgent,
    switchModel,
    chat: agentService.chat.bind(agentService),
    orchestrate: agentService.orchestrate.bind(agentService),
    generateCode: agentService.generateCode.bind(agentService),
    reason: agentService.reason.bind(agentService),
    creativeWrite: agentService.creativeWrite.bind(agentService),
    reload: loadAgents,
  };
}