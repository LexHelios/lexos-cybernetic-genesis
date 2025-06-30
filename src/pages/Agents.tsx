
import React, { useState } from 'react';
import { useAgents } from '@/hooks/useAgents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Brain, 
  Cpu, 
  Eye, 
  MessageSquare, 
  Play, 
  Pause, 
  Settings, 
  Zap,
  Search,
  Plus,
  AlertCircle
} from 'lucide-react';

const Agents = () => {
  const { agents, isLoading, error } = useAgents();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAgents = agents?.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.type.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="w-4 h-4" />;
      case 'idle': return <Pause className="w-4 h-4" />;
      case 'offline': return <AlertCircle className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Neural Agents
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="holographic-panel animate-pulse">
              <CardHeader>
                <div className="h-4 bg-primary/20 rounded mb-2"></div>
                <div className="h-6 bg-primary/20 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-3 bg-primary/20 rounded"></div>
                  <div className="h-3 bg-primary/20 rounded w-3/4"></div>
                  <div className="h-8 bg-primary/20 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="holographic-panel border-red-500/30 bg-red-500/5">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-orbitron font-bold text-red-400 mb-2">
              Neural Network Error
            </h3>
            <p className="text-red-300">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Neural Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your AI agent collective
          </p>
        </div>
        <Button className="neural-button">
          <Plus className="w-4 h-4 mr-2" />
          Deploy Agent
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search agents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 neural-input"
          />
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{agents?.filter(a => a.status === 'active').length || 0} Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>{agents?.filter(a => a.status === 'idle').length || 0} Idle</span>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <Card key={agent.id} className="holographic-panel hover:border-primary/50 transition-all duration-300 group">
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
                  <span className="text-primary font-mono">{agent.performance}%</span>
                </div>
                <Progress value={agent.performance} className="h-2" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 bg-background/50 rounded">
                  <div className="font-mono text-lg text-primary">{agent.tasksCompleted}</div>
                  <div className="text-muted-foreground">Tasks</div>
                </div>
                <div className="text-center p-2 bg-background/50 rounded">
                  <div className="font-mono text-lg text-green-400">{agent.uptime}</div>
                  <div className="text-muted-foreground">Uptime</div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Capabilities:</p>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities?.map((cap, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Chat
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <Settings className="w-3 h-3 mr-1" />
                  Config
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAgents.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-orbitron font-bold text-muted-foreground mb-2">
            No agents found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search terms or deploy a new agent.
          </p>
        </div>
      )}
    </div>
  );
};

export default Agents;
