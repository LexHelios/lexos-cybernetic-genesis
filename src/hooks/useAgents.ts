
import { useState, useEffect } from 'react';
import { Agent } from '../types/api';
import { apiClient } from '../services/api';
import { websocketService } from '../services/websocket';

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.getAgents();
        setAgents(response.agents);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch agents');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAgents();

    // Subscribe to real-time agent updates
    const unsubscribe = websocketService.subscribe('agent_status', (data) => {
      setAgents(prevAgents => 
        prevAgents.map(agent => 
          agent.agent_id === data.agent_id 
            ? { ...agent, status: data.status }
            : agent
        )
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return { agents, isLoading, error, refetch: () => {} };
};
