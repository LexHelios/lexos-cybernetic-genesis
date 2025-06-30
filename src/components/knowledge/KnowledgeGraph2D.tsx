import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { 
  Search, 
  Filter, 
  Maximize2, 
  RefreshCcw, 
  Download,
  Zap,
  Network
} from 'lucide-react';
import { apiClient } from '../../services/api';

interface GraphNode {
  id: string;
  label: string;
  type: 'concept' | 'entity' | 'relation' | 'document';
  properties: Record<string, any>;
  x?: number;
  y?: number;
  connections: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  weight: number;
  type: string;
}

interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    total_nodes: number;
    total_edges: number;
    last_updated: string;
  };
}

const KnowledgeGraph2D = () => {
  const [graphData, setGraphData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getKnowledgeGraph();
      setGraphData(response);
    } catch (error) {
      console.error('Failed to fetch knowledge graph:', error);
      // Set mock data for development
      setGraphData({
        nodes: [
          {
            id: 'node1',
            label: 'Artificial Intelligence',
            type: 'concept',
            properties: { description: 'Core AI concepts and methodologies' },
            connections: 15,
            x: 100,
            y: 100
          },
          {
            id: 'node2',
            label: 'Machine Learning',
            type: 'concept',
            properties: { description: 'ML algorithms and techniques' },
            connections: 12,
            x: 200,
            y: 150
          },
          {
            id: 'node3',
            label: 'Neural Networks',
            type: 'concept',
            properties: { description: 'Deep learning architectures' },
            connections: 8,
            x: 150,
            y: 250
          }
        ],
        edges: [
          {
            id: 'edge1',
            source: 'node1',
            target: 'node2',
            label: 'includes',
            weight: 0.8,
            type: 'hierarchical'
          },
          {
            id: 'edge2',
            source: 'node2',
            target: 'node3',
            label: 'implements',
            weight: 0.9,
            type: 'functional'
          }
        ],
        metadata: {
          total_nodes: 3,
          total_edges: 2,
          last_updated: new Date().toISOString()
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = async (nodeId: string) => {
    try {
      const node = graphData?.nodes.find(n => n.id === nodeId);
      if (node) {
        setSelectedNode(node);
        // Fetch subgraph for selected node
        const subgraph = await apiClient.getNodeSubgraph(nodeId);
        // Update visualization with subgraph data
        console.log('Subgraph data:', subgraph);
      }
    } catch (error) {
      console.error('Failed to fetch node subgraph:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await apiClient.searchKnowledgeGraph(searchQuery);
      console.log('Search results:', results);
      // Update graph to highlight search results
    } catch (error) {
      console.error('Failed to search knowledge graph:', error);
    }
  };

  useEffect(() => {
    if (!canvasRef.current || !graphData) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawGraph = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw edges
      graphData.edges.forEach(edge => {
        const sourceNode = graphData.nodes.find(node => node.id === edge.source);
        const targetNode = graphData.nodes.find(node => node.id === edge.target);

        if (sourceNode && targetNode && sourceNode.x && targetNode.x && sourceNode.y && targetNode.y) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = '#9CA3AF';
          ctx.lineWidth = edge.weight * 2;
          ctx.stroke();

          // Draw edge label
          const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
          const x = (sourceNode.x + targetNode.x) / 2;
          const y = (sourceNode.y + targetNode.y) / 2;

          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#6B7280';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(edge.label, x + 10 * Math.cos(angle + Math.PI / 2), y + 10 * Math.sin(angle + Math.PI / 2));
        }
      });

      // Draw nodes
      graphData.nodes.forEach(node => {
        if (node.x && node.y) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 15, 0, 2 * Math.PI);
          ctx.fillStyle = '#E5E7EB';
          ctx.fill();
          ctx.strokeStyle = '#6B7280';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw node label
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#111827';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.label, node.x, node.y);
        }
      });
    };

    drawGraph();
  }, [graphData]);

  useEffect(() => {
    fetchGraphData();
  }, []);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Network className="w-5 h-5 text-primary" />
              <span>Knowledge Graph</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} size="sm">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={fetchGraphData} variant="outline" size="sm">
                <RefreshCcw className="w-4 h-4" />
              </Button>
              <Button 
                onClick={() => setIsFullscreen(!isFullscreen)} 
                variant="outline" 
                size="sm"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-96">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCcw className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="relative h-full">
              <canvas
                ref={canvasRef}
                className="w-full h-full border rounded-lg cursor-pointer"
                onClick={(e) => {
                  // Handle canvas click to select nodes
                  const rect = canvasRef.current?.getBoundingClientRect();
                  if (rect) {
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    // Find clicked node and handle selection
                    console.log('Canvas clicked at:', x, y);
                  }
                }}
              />
              {selectedNode && (
                <div className="absolute top-4 right-4 bg-card border rounded-lg p-4 shadow-lg max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{selectedNode.type}</Badge>
                    <Button
                      onClick={() => setSelectedNode(null)}
                      variant="ghost"
                      size="sm"
                    >
                      ×
                    </Button>
                  </div>
                  <h4 className="font-medium mb-2">{selectedNode.label}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedNode.properties.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Connections: {selectedNode.connections}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeGraph2D;
