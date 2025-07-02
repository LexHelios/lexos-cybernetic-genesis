
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Agent } from '@/types/api';
import { 
  Activity, 
  Pause, 
  AlertCircle, 
  Eye, 
  MessageSquare, 
  Settings,
  Play
} from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onChatClick?: (agentId: string) => void;
  onConfigClick?: (agentId: string) => void;
  onStartClick?: (agentId: string) => void;
  onStopClick?: (agentId: string) => void;
  onTaskSubmit?: (agentId: string) => void;
  onConfigure?: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ 
  agent, 
  onChatClick, 
  onConfigClick,
  onStartClick,
  onStopClick,
  onTaskSubmit,
  onConfigure
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'inactive': 
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4" />;
      case 'idle': return <Pause className="w-4 h-4" />;
      case 'inactive':
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const handleConfigClick = () => {
    if (onConfigClick) {
      onConfigClick(agent.agent_id);
    } else if (onConfigure) {
      onConfigure(agent.agent_id);
    }
  };

  return (
    <Card className="holographic-panel hover:border-primary/50 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)} animate-pulse`}></div>
            <Badge variant="outline" className="text-xs">
              {agent.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(agent.status)}
          </div>
        </div>
        <CardTitle className="text-lg font-orbitron text-primary group-hover:text-cyan-300 transition-colors">
          {agent.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{agent.type}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Performance Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Performance</span>
            <span className="text-primary font-mono">{agent.performance || 0}%</span>
          </div>
          <Progress value={agent.performance || 0} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-background/50 rounded">
            <div className="font-mono text-lg text-primary">
              {agent.tasksCompleted || agent.total_tasks_completed || 0}
            </div>
            <div className="text-muted-foreground">Tasks</div>
          </div>
          <div className="text-center p-2 bg-background/50 rounded">
            <div className="font-mono text-lg text-green-400">{agent.uptime || '0h'}</div>
            <div className="text-muted-foreground">Uptime</div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Capabilities:</p>
          <div className="flex flex-wrap gap-1">
            {agent.capabilities?.map((cap, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {typeof cap === 'string' ? cap : 'Unknown'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onChatClick?.(agent.agent_id)}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Chat
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={handleConfigClick}
          >
            <Settings className="w-3 h-3 mr-1" />
            Config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgentCard;
