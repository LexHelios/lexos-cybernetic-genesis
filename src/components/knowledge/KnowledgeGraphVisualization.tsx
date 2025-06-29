import React, { useRef, useState, useEffect, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { Search, Loader2, ZoomIn, ZoomOut, Move3D, Maximize2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { apiClient } from '../../services/api';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: any;
  color?: string;
  size?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: any;
  color?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphEdge[];
}

const nodeColors: Record<string, string> = {
  agent: '#8B5CF6',    // purple
  task: '#3B82F6',     // blue
  memory: '#10B981',   // green
  user: '#F59E0B',     // amber
  model: '#EF4444'     // red
};

const edgeColors: Record<string, string> = {
  executes: '#60A5FA',
  created_by: '#FCD34D',
  has_memory: '#6EE7B7',
  relates_to: '#C7D2FE',
  uses_model: '#FCA5A5',
  collaborates: '#A78BFA'
};

export default function KnowledgeGraphVisualization() {
  const fgRef = useRef<any>();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Load initial graph data
  useEffect(() => {
    loadGraphData();
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getKnowledgeGraph({ limit: 500 });
      
      // Transform the data for ForceGraph3D
      const transformedData: GraphData = {
        nodes: response.nodes.map(node => ({
          ...node,
          color: nodeColors[node.type] || '#999999',
          size: node.type === 'agent' ? 8 : node.type === 'user' ? 7 : 5
        })),
        links: response.edges.map(edge => ({
          ...edge,
          color: edgeColors[edge.type] || '#666666'
        }))
      };
      
      setGraphData(transformedData);
      setStatistics(response.statistics);
    } catch (error) {
      console.error('Failed to load knowledge graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNodeClick = useCallback(async (node: any) => {
    setSelectedNode(node);
    
    // Load subgraph for the selected node
    try {
      const subgraph = await apiClient.getNodeSubgraph(node.id, 2);
      
      // Merge subgraph with existing data
      const existingNodeIds = new Set(graphData.nodes.map(n => n.id));
      const existingEdgeIds = new Set(graphData.links.map(e => e.id));
      
      const newNodes = subgraph.nodes
        .filter(n => !existingNodeIds.has(n.id))
        .map(n => ({
          ...n,
          color: nodeColors[n.type] || '#999999',
          size: n.type === 'agent' ? 8 : n.type === 'user' ? 7 : 5
        }));
      
      const newEdges = subgraph.edges
        .filter(e => !existingEdgeIds.has(e.id))
        .map(e => ({
          ...e,
          color: edgeColors[e.type] || '#666666'
        }));
      
      setGraphData(prev => ({
        nodes: [...prev.nodes, ...newNodes],
        links: [...prev.links, ...newEdges]
      }));
    } catch (error) {
      console.error('Failed to load node subgraph:', error);
    }
  }, [graphData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await apiClient.searchKnowledgeGraph(searchQuery);
      
      // Highlight search results
      const resultIds = new Set(results.results.map(r => r.id));
      
      setGraphData(prev => ({
        nodes: prev.nodes.map(node => ({
          ...node,
          color: resultIds.has(node.id) 
            ? '#FBBF24' // highlight color
            : nodeColors[node.type] || '#999999'
        })),
        links: prev.links
      }));
      
      // Focus on first result
      if (results.results.length > 0 && fgRef.current) {
        const firstResult = graphData.nodes.find(n => n.id === results.results[0].id);
        if (firstResult) {
          fgRef.current.centerAt(firstResult.x, firstResult.y, firstResult.z, 1000);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleZoomIn = () => {
    if (fgRef.current) {
      const camera = fgRef.current.camera();
      camera.position.multiplyScalar(0.8);
      camera.lookAt(0, 0, 0);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      const camera = fgRef.current.camera();
      camera.position.multiplyScalar(1.2);
      camera.lookAt(0, 0, 0);
    }
  };

  const handleResetView = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400);
    }
  };

  const nodeLabel = useCallback((node: any) => {
    return `<div style="color: white; background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px;">
      <strong>${node.label}</strong><br/>
      <span style="font-size: 0.8em; color: #ccc;">${node.type}</span>
    </div>`;
  }, []);

  const nodeThreeObject = useCallback((node: any) => {
    const geometry = node.type === 'agent' 
      ? new THREE.SphereGeometry(node.size || 5)
      : node.type === 'user'
      ? new THREE.OctahedronGeometry(node.size || 5)
      : new THREE.BoxGeometry(node.size || 5, node.size || 5, node.size || 5);
    
    const material = new THREE.MeshLambertMaterial({
      color: node.color || '#999999',
      emissive: node === hoveredNode ? node.color : undefined,
      emissiveIntensity: 0.3
    });
    
    return new THREE.Mesh(geometry, material);
  }, [hoveredNode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-neural-purple" />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-4">
        {/* Search */}
        <Card className="p-4 bg-background/90 backdrop-blur-sm">
          <div className="flex gap-2">
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-64"
            />
            <Button onClick={handleSearch} size="icon">
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {/* View Controls */}
        <Card className="p-2 bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <Button onClick={handleZoomIn} size="sm" variant="ghost">
              <ZoomIn className="w-4 h-4 mr-2" />
              Zoom In
            </Button>
            <Button onClick={handleZoomOut} size="sm" variant="ghost">
              <ZoomOut className="w-4 h-4 mr-2" />
              Zoom Out
            </Button>
            <Button onClick={handleResetView} size="sm" variant="ghost">
              <Maximize2 className="w-4 h-4 mr-2" />
              Reset View
            </Button>
            <Button 
              onClick={() => setViewMode(viewMode === '3d' ? '2d' : '3d')} 
              size="sm" 
              variant="ghost"
            >
              <Move3D className="w-4 h-4 mr-2" />
              {viewMode === '3d' ? '2D View' : '3D View'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="absolute top-4 right-4 z-10">
          <Card className="p-4 bg-background/90 backdrop-blur-sm">
            <h3 className="font-semibold mb-2">Graph Statistics</h3>
            <div className="space-y-2 text-sm">
              <div>Total Nodes: {statistics.nodeCount}</div>
              <div>Total Edges: {statistics.edgeCount}</div>
              <div className="space-y-1">
                <div className="font-medium">Node Types:</div>
                {Object.entries(statistics.nodeTypes).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-2 ml-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: nodeColors[type] || '#999' }}
                    />
                    <span className="capitalize">{type}: {count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10">
          <Card className="p-4 bg-background/90 backdrop-blur-sm max-w-sm">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{selectedNode.label}</h3>
              <Badge style={{ backgroundColor: nodeColors[selectedNode.type] }}>
                {selectedNode.type}
              </Badge>
            </div>
            <div className="space-y-1 text-sm">
              {Object.entries(selectedNode.properties).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-muted-foreground">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
            <Button 
              onClick={() => setSelectedNode(null)} 
              size="sm" 
              variant="ghost"
              className="mt-2"
            >
              Close
            </Button>
          </Card>
        </div>
      )}

      {/* Graph Visualization */}
      <div className="w-full h-full bg-black/10">
        <ForceGraph3D
          ref={fgRef}
          graphData={graphData}
          nodeId="id"
          nodeLabel={nodeLabel}
          nodeAutoColorBy="type"
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          linkColor="color"
          linkOpacity={0.6}
          linkWidth={2}
          onNodeClick={handleNodeClick}
          onNodeHover={setHoveredNode}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
          backgroundColor="rgba(0,0,0,0)"
          width={window.innerWidth - 300} // Account for sidebar
          height={window.innerHeight - 100} // Account for header
        />
      </div>
    </div>
  );
}