import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ZoomIn, ZoomOut, Maximize2, Info } from 'lucide-react';
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
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties?: any;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
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

export default function KnowledgeGraph2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const animationFrameRef = useRef<number>();
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  useEffect(() => {
    loadGraphData();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getKnowledgeGraph({ limit: 200 });
      
      // Initialize node positions randomly
      const nodes = response.nodes.map((node, i) => ({
        ...node,
        x: Math.cos(2 * Math.PI * i / response.nodes.length) * 200 + Math.random() * 100 - 50,
        y: Math.sin(2 * Math.PI * i / response.nodes.length) * 200 + Math.random() * 100 - 50,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null
      }));
      
      setGraphData({ nodes, edges: response.edges });
      setStatistics(response.statistics);
      
      // Start force simulation
      startForceSimulation(nodes, response.edges);
    } catch (error) {
      console.error('Failed to load knowledge graph:', error);
    } finally {
      setLoading(false);
    }
  };

  const startForceSimulation = (nodes: GraphNode[], edges: GraphEdge[]) => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const alpha = 0.1;
    const alphaDecay = 0.99;
    let currentAlpha = alpha;

    const simulate = () => {
      // Apply forces
      nodes.forEach((node, i) => {
        if (node.fx !== null && node.fx !== undefined) node.x = node.fx;
        if (node.fy !== null && node.fy !== undefined) node.y = node.fy;
        
        // Reset forces
        node.vx = (node.vx || 0) * 0.9;
        node.vy = (node.vy || 0) * 0.9;
        
        // Repulsion between nodes
        nodes.forEach((other, j) => {
          if (i !== j) {
            const dx = (node.x || 0) - (other.x || 0);
            const dy = (node.y || 0) - (other.y || 0);
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = (30 * 30) / (distance * distance) * currentAlpha;
            
            node.vx! += (dx / distance) * force;
            node.vy! += (dy / distance) * force;
          }
        });
        
        // Center force
        node.vx! -= (node.x || 0) * 0.01 * currentAlpha;
        node.vy! -= (node.y || 0) * 0.01 * currentAlpha;
      });
      
      // Apply edge constraints
      edges.forEach(edge => {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        
        if (source && target) {
          const dx = (target.x || 0) - (source.x || 0);
          const dy = (target.y || 0) - (source.y || 0);
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance - 100) * 0.1 * currentAlpha;
          
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          source.vx! += fx;
          source.vy! += fy;
          target.vx! -= fx;
          target.vy! -= fy;
        }
      });
      
      // Update positions
      nodes.forEach(node => {
        if (node.fx === null || node.fx === undefined) {
          node.x! += node.vx!;
          node.y! += node.vy!;
        }
      });
      
      // Update node positions reference
      nodes.forEach(node => {
        nodePositionsRef.current.set(node.id, { x: node.x || 0, y: node.y || 0 });
      });
      
      // Decay alpha
      currentAlpha *= alphaDecay;
      
      // Render
      render();
      
      // Continue simulation
      if (currentAlpha > 0.001) {
        animationFrameRef.current = requestAnimationFrame(simulate);
      }
    };
    
    simulate();
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Save context
    ctx.save();
    
    // Apply transform
    ctx.translate(canvas.width / 2 + transform.x, canvas.height / 2 + transform.y);
    ctx.scale(transform.scale, transform.scale);
    
    // Draw edges
    graphData.edges.forEach(edge => {
      const source = nodePositionsRef.current.get(edge.source);
      const target = nodePositionsRef.current.get(edge.target);
      
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = edgeColors[edge.type] || '#666666';
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Draw nodes
    ctx.globalAlpha = 1;
    graphData.nodes.forEach(node => {
      const pos = nodePositionsRef.current.get(node.id) || { x: node.x || 0, y: node.y || 0 };
      const radius = node.type === 'agent' ? 8 : node.type === 'user' ? 7 : 5;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColors[node.type] || '#999999';
      
      if (node === hoveredNode || node === selectedNode) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = nodeColors[node.type] || '#999999';
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw label for hovered or selected nodes
      if (node === hoveredNode || node === selectedNode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, pos.x, pos.y - radius - 5);
      }
    });
    
    // Restore context
    ctx.restore();
  }, [graphData, hoveredNode, selectedNode, transform]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      render();
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [render]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - canvas.width / 2 - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - canvas.height / 2 - transform.y) / transform.scale;
    
    if (isDraggingRef.current) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      }));
      render();
    } else {
      // Check for node hover
      let foundNode: GraphNode | null = null;
      graphData.nodes.forEach(node => {
        const pos = nodePositionsRef.current.get(node.id) || { x: node.x || 0, y: node.y || 0 };
        const radius = node.type === 'agent' ? 8 : node.type === 'user' ? 7 : 5;
        const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
        
        if (distance <= radius) {
          foundNode = node;
        }
      });
      
      if (foundNode !== hoveredNode) {
        setHoveredNode(foundNode);
        render();
      }
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(5, prev.scale * scaleFactor))
    }));
    render();
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      setSelectedNode(hoveredNode);
      loadNodeSubgraph(hoveredNode.id);
    }
  };

  const loadNodeSubgraph = async (nodeId: string) => {
    try {
      const subgraph = await apiClient.getNodeSubgraph(nodeId, 2);
      
      // Merge subgraph with existing data
      const existingNodeIds = new Set(graphData.nodes.map(n => n.id));
      const existingEdgeIds = new Set(graphData.edges.map(e => e.id));
      
      const centerNode = nodePositionsRef.current.get(nodeId) || { x: 0, y: 0 };
      
      const newNodes = subgraph.nodes
        .filter(n => !existingNodeIds.has(n.id))
        .map((n, i) => ({
          ...n,
          x: centerNode.x + Math.cos(2 * Math.PI * i / subgraph.nodes.length) * 100,
          y: centerNode.y + Math.sin(2 * Math.PI * i / subgraph.nodes.length) * 100,
          vx: 0,
          vy: 0,
          fx: null,
          fy: null
        }));
      
      const newEdges = subgraph.edges
        .filter(e => !existingEdgeIds.has(e.id));
      
      const updatedNodes = [...graphData.nodes, ...newNodes];
      const updatedEdges = [...graphData.edges, ...newEdges];
      
      setGraphData({ nodes: updatedNodes, edges: updatedEdges });
      startForceSimulation(updatedNodes, updatedEdges);
    } catch (error) {
      console.error('Failed to load node subgraph:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const results = await apiClient.searchKnowledgeGraph(searchQuery);
      
      if (results.results.length > 0) {
        const firstResult = graphData.nodes.find(n => n.id === results.results[0].id);
        if (firstResult) {
          setSelectedNode(firstResult);
          const pos = nodePositionsRef.current.get(firstResult.id);
          if (pos) {
            setTransform({
              x: -pos.x * transform.scale,
              y: -pos.y * transform.scale,
              scale: transform.scale
            });
            render();
          }
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleZoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(5, prev.scale * 1.2) }));
    render();
  };

  const handleZoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(0.1, prev.scale * 0.8) }));
    render();
  };

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    render();
  };

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
          </div>
        </Card>

        {/* Legend */}
        <Card className="p-4 bg-background/90 backdrop-blur-sm">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4" />
            Legend
          </h4>
          <div className="space-y-1 text-sm">
            {Object.entries(nodeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="capitalize">{type}</span>
              </div>
            ))}
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

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      />
    </div>
  );
}