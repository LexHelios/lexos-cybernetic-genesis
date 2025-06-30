
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Download, 
  Play, 
  Pause, 
  Search,
  Filter,
  Plus,
  Activity,
  Zap,
  HardDrive,
  Cpu,
  Eye,
  MessageSquare,
  Code,
  Image,
  Music
} from 'lucide-react';

// Mock model data
const mockModels = [
  {
    id: 'llama3.2-70b',
    name: 'Llama 3.2 70B',
    description: 'Advanced reasoning and code generation model',
    status: 'active',
    size: '70B',
    type: 'LLM',
    capabilities: ['reasoning', 'coding', 'analysis'],
    downloaded: true,
    inUse: true,
    performance: 95,
    memoryUsage: '45.2 GB',
    version: '3.2',
    provider: 'Meta',
    lastUsed: '2025-01-02T10:30:00Z'
  },
  {
    id: 'gemma2-27b',
    name: 'Gemma 2 27B',
    description: 'Efficient instruction-following model',
    status: 'active',
    size: '27B',
    type: 'LLM',
    capabilities: ['instruction', 'chat', 'reasoning'],
    downloaded: true,
    inUse: false,
    performance: 88,
    memoryUsage: '16.8 GB',
    version: '2.0',
    provider: 'Google',
    lastUsed: '2025-01-02T09:15:00Z'
  },
  {
    id: 'r1-unrestricted',
    name: 'R1 Unrestricted',
    description: 'Next-gen reasoning model with enhanced capabilities',
    status: 'downloading',
    size: '32B',
    type: 'Reasoning',
    capabilities: ['reasoning', 'analysis', 'research'],
    downloaded: false,
    inUse: false,
    downloadProgress: 67,
    version: '1.0',
    provider: 'DeepSeek',
    eta: '2025-01-02T11:00:00Z'
  },
  {
    id: 'flux-dev',
    name: 'FLUX.1 Dev',
    description: 'State-of-the-art image generation model',
    status: 'idle',
    size: '12B',
    type: 'Diffusion',
    capabilities: ['image-generation', 'artistic', 'photorealistic'],
    downloaded: true,
    inUse: false,
    performance: 92,
    memoryUsage: '8.4 GB',
    version: '1.0',
    provider: 'Black Forest Labs',
    lastUsed: '2025-01-01T14:20:00Z'
  },
  {
    id: 'whisper-large-v3',
    name: 'Whisper Large V3',
    description: 'Advanced speech recognition and transcription',
    status: 'idle',
    size: '1.55B',
    type: 'Audio',
    capabilities: ['transcription', 'translation', 'voice'],
    downloaded: true,
    inUse: false,
    performance: 94,
    memoryUsage: '2.1 GB',
    version: '3.0',
    provider: 'OpenAI',
    lastUsed: '2025-01-01T16:45:00Z'
  }
];

const Models = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'downloading': return 'bg-blue-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'LLM': return <Brain className="w-4 h-4" />;
      case 'Reasoning': return <Zap className="w-4 h-4" />;
      case 'Diffusion': return <Image className="w-4 h-4" />;
      case 'Audio': return <Music className="w-4 h-4" />;
      default: return <Cpu className="w-4 h-4" />;
    }
  };

  const filteredModels = mockModels.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         model.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedTab === 'all') return matchesSearch;
    if (selectedTab === 'active') return matchesSearch && model.status === 'active';
    if (selectedTab === 'downloaded') return matchesSearch && model.downloaded;
    return matchesSearch && model.type.toLowerCase() === selectedTab.toLowerCase();
  });

  const modelCounts = {
    all: mockModels.length,
    active: mockModels.filter(m => m.status === 'active').length,
    downloaded: mockModels.filter(m => m.downloaded).length,
    llm: mockModels.filter(m => m.type === 'LLM').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Model Arsenal
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI model collection and deployments
          </p>
        </div>
        <Button className="neural-button">
          <Plus className="w-4 h-4 mr-2" />
          Add Model
        </Button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 neural-input"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Queue
          </Button>
        </div>
      </div>

      {/* Model Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4">
          <TabsTrigger value="all">
            All Models
            <Badge variant="secondary" className="ml-2 text-xs">
              {modelCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="active">
            Active
            <Badge variant="secondary" className="ml-2 text-xs bg-green-500/20 text-green-300">
              {modelCounts.active}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="downloaded">
            Downloaded
            <Badge variant="secondary" className="ml-2 text-xs bg-blue-500/20 text-blue-300">
              {modelCounts.downloaded}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="llm">
            LLMs
            <Badge variant="secondary" className="ml-2 text-xs bg-purple-500/20 text-purple-300">
              {modelCounts.llm}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredModels.map((model) => (
              <Card key={model.id} className="holographic-panel hover:border-primary/50 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(model.type)}
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(model.status)} animate-pulse`}></div>
                      </div>
                      <div>
                        <CardTitle className="text-lg font-orbitron text-primary">
                          {model.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {model.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {model.size}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {model.provider}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Download Progress */}
                  {model.status === 'downloading' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Downloading...</span>
                        <span className="text-primary font-mono">{model.downloadProgress}%</span>
                      </div>
                      <Progress value={model.downloadProgress} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        ETA: {new Date(model.eta!).toLocaleTimeString()}
                      </div>
                    </div>
                  )}

                  {/* Performance & Usage */}
                  {model.downloaded && model.status !== 'downloading' && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Performance:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={model.performance} className="h-2 flex-1" />
                          <span className="font-mono text-primary">{model.performance}%</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Memory:</span>
                        <div className="font-mono text-cyan-400 mt-1">{model.memoryUsage}</div>
                      </div>
                    </div>
                  )}

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Capabilities:</p>
                    <div className="flex flex-wrap gap-1">
                      {model.capabilities.map((cap, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Status & Last Used */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="capitalize">{model.status}</span>
                        {model.inUse && <Badge variant="outline" className="text-xs">In Use</Badge>}
                      </div>
                    </div>
                    {model.lastUsed && (
                      <div>
                        <span className="text-muted-foreground">Last Used:</span>
                        <div className="font-mono text-xs mt-1">
                          {new Date(model.lastUsed).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!model.downloaded ? (
                      <Button size="sm" className="flex-1">
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    ) : (
                      <>
                        {model.status === 'active' ? (
                          <Button size="sm" variant="outline">
                            <Pause className="w-3 h-3 mr-1" />
                            Stop
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline">
                            <Play className="w-3 h-3 mr-1" />
                            Start
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <MessageSquare className="w-3 h-3 mr-1" />
                          Test
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-3 h-3 mr-1" />
                          Info
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-orbitron font-bold text-muted-foreground mb-2">
            No models found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'Add models to your arsenal to get started.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Models;
