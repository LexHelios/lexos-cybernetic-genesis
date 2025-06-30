import React from 'react';
import { Bot, Play, Pause, Settings, Trash2, Activity, Zap } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/use-toast';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'error' | 'training';
  performance: number;
  tasksCompleted: number;
  uptime: string;
  capabilities: string[];
}

interface AgentCardProps {
  agent: Agent;
  onStart?: (agentId: string) => void;
  onStop?: (agentId: string) => void;
  onConfigure?: (agentId: string) => void;
  onDelete?: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onStart, onStop, onConfigure, onDelete }) => {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    toast({
      title: `Agent ${action}`,
      description: `${agent.name} ${action} initiated`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'training':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
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
              <CardDescription>{agent.type}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} animate-pulse`} />
            <Badge variant="outline" className="border-matrix-green/50">
              {agent.status.toUpperCase()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Performance</span>
            <span className="text-sm font-mono">{agent.performance}%</span>
          </div>
          <Progress value={agent.performance} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-electric-blue" />
            <span>{agent.tasksCompleted} tasks</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-cyber-pink" />
            <span>{agent.uptime} uptime</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1">
          {agent.capabilities.map((capability, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {capability}
            </Badge>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="flex space-x-2">
          {agent.status === 'idle' ? (
            <Button
              size="sm"
              variant="outline"
              className="border-matrix-green/50 hover:bg-matrix-green/20"
              onClick={() => {
                handleAction('started');
                onStart?.(agent.id);
              }}
            >
              <Play className="w-4 h-4 mr-1" />
              Start
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="border-red-500/50 hover:bg-red-500/20"
              onClick={() => {
                handleAction('stopped');
                onStop?.(agent.id);
              }}
            >
              <Pause className="w-4 h-4 mr-1" />
              Stop
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              handleAction('configuration opened');
              onConfigure?.(agent.id);
            }}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-400"
          onClick={() => {
            handleAction('deleted');
            onDelete?.(agent.id);
          }}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AgentCard;