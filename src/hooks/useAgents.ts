
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
      
      // More robust response handling
      if (response && typeof response === 'object') {
        const agentsList = response.agents || response.data || [];
        const safeAgents = Array.isArray(agentsList) ? agentsList : [];
        console.log('Setting agents:', safeAgents);
        setAgents(safeAgents);
      } else {
        console.warn('Invalid response format, setting empty array');
        setAgents([]);
      }
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      setAgents([]); // Always ensure agents is an array
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();

    // Subscribe to real-time agent updates
    const unsubscribeAgentStatus = websocketService.subscribe('agent_status', (data) => {
      console.log('Agent status update:', data);
      setAgents(prevAgents => {
        // Ensure prevAgents is always an array
        const safeAgents = Array.isArray(prevAgents) ? prevAgents : [];
        return safeAgents.map(agent => 
          agent.agent_id === data.agent_id 
            ? { ...agent, ...data }
            : agent
        );
      });
    });

    const unsubscribeTaskUpdate = websocketService.subscribe('task_update', (data) => {
      console.log('Task update:', data);
      if (data.status === 'completed' || data.status === 'failed') {
        setAgents(prevAgents => {
          const safeAgents = Array.isArray(prevAgents) ? prevAgents : [];
          return safeAgents.map(agent => 
            agent.agent_id === data.agent_id 
              ? { 
                  ...agent, 
                  current_tasks: Math.max(0, agent.current_tasks - 1),
                  total_tasks_completed: agent.total_tasks_completed + (data.status === 'completed' ? 1 : 0)
                }
              : agent
          );
        });
      }
    });

    return () => {
      unsubscribeAgentStatus();
      unsubscribeTaskUpdate();
    };
  }, []);

  return { 
    agents: Array.isArray(agents) ? agents : [], // Final safeguard
    isLoading, 
    error, 
    refetch: fetchAgents 
  };
};
