
import React from 'react';
import { Bot, Play, Pause, Settings, Trash2, Activity, Zap, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/use-toast';
import { Agent } from '../../types/api';

interface AgentCardProps {
  agent: Agent;
  onTaskSubmit?: (agentId: string) => void;
  onConfigure?: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onTaskSubmit, onConfigure }) => {
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'busy':
        return 'bg-blue-500';
      case 'inactive':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'ONLINE';
      case 'busy':
        return 'PROCESSING';
      case 'inactive':
        return 'OFFLINE';
      case 'error':
        return 'ERROR';
      default:
        return status.toUpperCase();
    }
  };

  const formatUptime = (lastActivity: number) => {
    const now = Date.now();
    const diff = now - lastActivity;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return 'Just now';
  };

  const calculatePerformance = () => {
    if (agent.total_tasks_completed === 0) return 0;
    // Simple performance calculation based on response time and completion rate
    const basePerformance = Math.max(0, 100 - (agent.average_response_time * 10));
    return Math.min(100, Math.max(0, basePerformance));
  };

  return (
    <Card className="holographic-panel border-matrix-green/30 hover:border-matrix-green/50 transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-matrix-green/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-matrix-green" />
            </div>
            <div>
              <CardTitle className="text-lg font-orbitron">{agent.name}</CardTitle>
              <CardDescription className="text-sm truncate max-w-48">
                {agent.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
            <Badge variant="outline" className="border-matrix-green/50 text-xs">
              {getStatusLabel(agent.status)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Performance</span>
            <span className="text-sm font-mono">{Math.round(calculatePerformance())}%</span>
          </div>
          <Progress value={calculatePerformance()} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-electric-blue" />
            <span>{agent.total_tasks_completed} tasks</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyber-pink" />
            <span>{formatUptime(agent.last_activity)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active:</span>
            <span className="font-mono">{agent.current_tasks}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Avg Response:</span>
            <span className="font-mono">{agent.average_response_time.toFixed(1)}s</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {agent.capabilities?.slice(0, 3).map((capability, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {capability.name}
            </Badge>
          ))}
          {agent.capabilities?.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{agent.capabilities.length - 3} more
            </Badge>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="outline"
            className="border-matrix-green/50 hover:bg-matrix-green/20"
            onClick={() => {
              onTaskSubmit?.(agent.agent_id);
              toast({
                title: "Task Submission",
                description: `Opening task submission for ${agent.name}`,
              });
            }}
            disabled={agent.status === 'error' || agent.status === 'inactive'}
          >
            <Zap className="w-4 h-4 mr-1" />
            Submit Task
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            onConfigure?.(agent.agent_id);
            toast({
              title: "Agent Configuration",
              description: `Opening configuration for ${agent.name}`,
            });
          }}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AgentCard;
