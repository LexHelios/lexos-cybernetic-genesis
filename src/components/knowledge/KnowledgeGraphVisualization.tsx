import React, { useState, useEffect, useCallback } from 'react';
import { ForceGraph3D } from 'react-force-graph-3d';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { RefreshCw, Search, XCircle } from 'lucide-react';
import { apiClient } from '../../services/api';

interface GraphNode {
  id: string;
  label: string;
  color: string;
  size: number;
  x?: number;
  y?: number;
  z?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const KnowledgeGraphVisualization = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [nodePosition, setNodePosition] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const mockNodes: GraphNode[] = [
    { id: '1', label: 'Node A', color: 'red', size: 10 },
    { id: '2', label: 'Node B', color: 'green', size: 10 },
    { id: '3', label: 'Node C', color: 'blue', size: 10 },
  ];

  const mockEdges: GraphEdge[] = [
    { source: '1', target: '2', label: 'Edge AB' },
    { source: '2', target: '3', label: 'Edge BC' },
  ];

  const fetchGraphData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getKnowledgeGraph();
      
      if (response?.nodes && response?.edges) {
        setGraphData(response);
      } else {
        // Mock data fallback
        setGraphData({
          nodes: mockNodes,
          edges: mockEdges
        });
      }
    } catch (error) {
      console.error('Failed to fetch graph data:', error);
      setGraphData({
        nodes: mockNodes,
        edges: mockEdges
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubgraph = async (nodeId: string) => {
    try {
      const response = await apiClient.getNodeSubgraph(nodeId);
      if (response?.nodes && response?.edges) {
        setGraphData(response);
      }
    } catch (error) {
      console.error('Failed to fetch subgraph:', error);
    }
  };

  const handleSearch = () => {
    if (searchQuery && selectedNode) {
      fetchSubgraph(selectedNode.id);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    fetchGraphData();
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    setNodePosition({
      x: (node as any).x || 0,
      y: (node as any).y || 0,
      z: (node as any).z || 0
    });
  }, []);

  useEffect(() => {
    fetchGraphData();
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Graph Visualization */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Knowledge Graph</CardTitle>
          <CardDescription>Visualize relationships between data entities</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ForceGraph3D
              graphData={graphData}
              nodeLabel="label"
              linkLabel="label"
              onNodeClick={handleNodeClick}
              nodeAutoColorBy="color"
              nodeVal={(node: any) => node.size}
            />
          )}
        </CardContent>
      </Card>

      {/* Node Details */}
      <Card>
        <CardHeader>
          <CardTitle>Node Details</CardTitle>
          <CardDescription>Information about the selected node</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedNode ? (
            <>
              <div className="space-y-2">
                <Label>Node ID</Label>
                <Input type="text" value={selectedNode.id} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input type="text" value={selectedNode.label} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input type="text" value={selectedNode.color} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Coordinates (X, Y, Z)</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input type="text" value={nodePosition.x.toFixed(2)} readOnly />
                  <Input type="text" value={nodePosition.y.toFixed(2)} readOnly />
                  <Input type="text" value={nodePosition.z.toFixed(2)} readOnly />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Search Subgraph</Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter search query..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute top-2.5 right-8 w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleSearch} className="w-full">
                    Search
                  </Button>
                  <Button onClick={handleClearSearch} variant="ghost" className="w-full">
                    <XCircle className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">Select a node to view details.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default KnowledgeGraphVisualization;
