
import { useState, useEffect } from 'react';
import { Agent } from '../types/api';
import { apiClient } from '../services/api';
import { websocketService } from '../services/websocket';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Fetching agents...');
      const response = await apiClient.getAgents();
      console.log('Agents response:', response);
      
      // Ensure we always set an array
      const agentsList = response?.agents || [];
      setAgents(Array.isArray(agentsList) ? agentsList : []);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      // Set empty array on error to prevent undefined
      setAgents([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();

    // Subscribe to real-time agent updates
    const unsubscribeAgentStatus = websocketService.subscribe('agent_status', (data) => {
      console.log('Agent status update:', data);
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.agent_id === data.agent_id 
            ? { ...agent, ...data }
            : agent
        )
      );
    });

    const unsubscribeTaskUpdate = websocketService.subscribe('task_update', (data) => {
      console.log('Task update:', data);
      // Update agent current_tasks count when tasks complete
      if (data.status === 'completed' || data.status === 'failed') {
        setAgents(prevAgents => 
          prevAgents.map(agent => 
            agent.agent_id === data.agent_id 
              ? { 
                  ...agent, 
                  current_tasks: Math.max(0, agent.current_tasks - 1),
                  total_tasks_completed: agent.total_tasks_completed + (data.status === 'completed' ? 1 : 0)
                }
              : agent
          )
        );
      }
    });

    return () => {
      unsubscribeAgentStatus();
      unsubscribeTaskUpdate();
    };
  }, []);

  return { 
    agents, 
    isLoading, 
    error, 
    refetch: fetchAgents 
  };
};
