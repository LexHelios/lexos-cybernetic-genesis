import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';

// Query keys
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: (filters: string) => [...agentKeys.lists(), { filters }] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
  logs: (id: string) => [...agentKeys.detail(id), 'logs'] as const,
  metrics: (id: string) => [...agentKeys.detail(id), 'metrics'] as const,
};

// Types
export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'error' | 'stopped';
  description?: string;
  capabilities: string[];
  memory: any;
  tools: any[];
  createdAt: string;
  updatedAt: string;
}

// Hooks
export const useAgents = () => {
  return useQuery({
    queryKey: agentKeys.lists(),
    queryFn: async () => {
      const { data } = await api.agents.list();
      return data;
    },
    staleTime: 30000, // 30 seconds
  });
};

export const useAgent = (id: string) => {
  return useQuery({
    queryKey: agentKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.agents.get(id);
      return data;
    },
    enabled: !!id,
  });
};

export const useAgentLogs = (id: string) => {
  return useQuery({
    queryKey: agentKeys.logs(id),
    queryFn: async () => {
      const { data } = await api.agents.logs(id);
      return data;
    },
    enabled: !!id,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
};

export const useAgentMetrics = (id: string) => {
  return useQuery({
    queryKey: agentKeys.metrics(id),
    queryFn: async () => {
      const { data } = await api.agents.metrics(id);
      return data;
    },
    enabled: !!id,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
};

// Mutations
export const useCreateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.agents.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success('Agent created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create agent: ${error.message}`);
    },
  });
};

export const useUpdateAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.agents.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success('Agent updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update agent: ${error.message}`);
    },
  });
};

export const useDeleteAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.agents.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success('Agent deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete agent: ${error.message}`);
    },
  });
};

export const useStartAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.agents.start,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success('Agent started successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to start agent: ${error.message}`);
    },
  });
};

export const useStopAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.agents.stop,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      toast.success('Agent stopped successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to stop agent: ${error.message}`);
    },
  });
};

export const useModifyAgent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, modification }: { id: string; modification: any }) =>
      api.agents.modify(id, modification),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(id) });
      toast.success('Agent modification submitted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to modify agent: ${error.message}`);
    },
  });
};