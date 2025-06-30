
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Cpu, HardDrive, Zap } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'loading';
  description: string;
  parameters: string;
  memory_usage: string;
  performance: number;
  capabilities: string[];
}

interface ModelCardProps {
  model: ModelInfo;
  onLoadClick?: (modelId: string) => void;
  onUnloadClick?: (modelId: string) => void;
  onConfigClick?: (modelId: string) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  model, 
  onLoadClick, 
  onUnloadClick,
  onConfigClick
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'loading': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Brain className="w-4 h-4" />;
      case 'loading': return <Cpu className="w-4 h-4 animate-spin" />;
      case 'inactive': return <HardDrive className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  return (
    <Card className="holographic-panel hover:border-primary/50 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)} animate-pulse`}></div>
            <Badge variant="outline" className="text-xs">
              {model.status.toUpperCase()}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(model.status)}
          </div>
        </div>
        <CardTitle className="text-lg font-orbitron text-primary group-hover:text-cyan-300 transition-colors">
          {model.name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{model.type}</p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{model.description}</p>
        
        {/* Performance Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Performance</span>
            <span className="text-primary font-mono">{model.performance}%</span>
          </div>
          <Progress value={model.performance} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center p-2 bg-background/50 rounded">
            <div className="font-mono text-sm text-primary">{model.parameters}</div>
            <div className="text-muted-foreground">Parameters</div>
          </div>
          <div className="text-center p-2 bg-background/50 rounded">
            <div className="font-mono text-sm text-green-400">{model.memory_usage}</div>
            <div className="text-muted-foreground">Memory</div>
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Capabilities:</p>
          <div className="flex flex-wrap gap-1">
            {model.capabilities?.map((cap, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {typeof cap === 'string' ? cap : 'Unknown'}
              </Badge>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {model.status === 'inactive' ? (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onLoadClick?.(model.id)}
            >
              <Zap className="w-3 h-3 mr-1" />
              Load
            </Button>
          ) : (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={() => onUnloadClick?.(model.id)}
            >
              <HardDrive className="w-3 h-3 mr-1" />
              Unload
            </Button>
          )}
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onConfigClick?.(model.id)}
          >
            <Cpu className="w-3 h-3 mr-1" />
            Config
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ModelCard;
