
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
      console.log('useAgents: Starting to fetch agents...');
      
      const response = await apiClient.getAgents();
      console.log('useAgents: Raw API response:', response);
      console.log('useAgents: Response type:', typeof response);
      console.log('useAgents: Response keys:', response ? Object.keys(response) : 'null');
      
      // Handle the actual API response structure
      if (response && typeof response === 'object') {
        const agentsList = response.agents || [];
        console.log('useAgents: Extracted agents list:', agentsList);
        console.log('useAgents: Is agents list an array?', Array.isArray(agentsList));
        
        const safeAgents = Array.isArray(agentsList) ? agentsList : [];
        console.log('useAgents: Safe agents array:', safeAgents);
        console.log('useAgents: Safe agents length:', safeAgents.length);
        setAgents(safeAgents);
      } else {
        console.warn('useAgents: Invalid response format, setting empty array');
        setAgents([]);
      }
    } catch (err) {
      console.error('useAgents: Failed to fetch agents:', err);
      console.error('useAgents: Error type:', typeof err);
      console.error('useAgents: Error message:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      setAgents([]); // Always ensure agents is an array
    } finally {
      setIsLoading(false);
      console.log('useAgents: Fetch complete, isLoading set to false');
    }
  };

  useEffect(() => {
    console.log('useAgents: useEffect triggered, starting fetch...');
    fetchAgents();

    // Subscribe to real-time agent updates
    console.log('useAgents: Setting up WebSocket subscriptions...');
    const unsubscribeAgentStatus = websocketService.subscribe('agent_status', (data) => {
      console.log('useAgents: Agent status update received:', data);
      setAgents(prevAgents => {
        const safeAgents = Array.isArray(prevAgents) ? prevAgents : [];
        return safeAgents.map(agent => 
          agent.agent_id === data.agent_id 
            ? { ...agent, ...data }
            : agent
        );
      });
    });

    const unsubscribeTaskUpdate = websocketService.subscribe('task_update', (data) => {
      console.log('useAgents: Task update received:', data);
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
      console.log('useAgents: Cleaning up WebSocket subscriptions...');
      unsubscribeAgentStatus();
      unsubscribeTaskUpdate();
    };
  }, []);

  console.log('useAgents: Returning state - agents:', agents, 'isLoading:', isLoading, 'error:', error);
  
  return { 
    agents: Array.isArray(agents) ? agents : [], // Final safeguard
    isLoading, 
    error, 
    refetch: fetchAgents 
  };
};
