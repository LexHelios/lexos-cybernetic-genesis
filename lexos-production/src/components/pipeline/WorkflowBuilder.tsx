import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Plus, Save, Play, Download, Upload, Trash2 } from 'lucide-react';

const nodeTypes = {
  shell: { label: 'Shell Command', color: '#3b82f6' },
  'http-request': { label: 'HTTP Request', color: '#10b981' },
  'data-transform': { label: 'Data Transform', color: '#f59e0b' },
  compute: { label: 'Compute', color: '#8b5cf6' },
  conditional: { label: 'Conditional', color: '#ef4444' },
  parallel: { label: 'Parallel', color: '#06b6d4' },
  loop: { label: 'Loop', color: '#ec4899' }
};

const WorkflowBuilderContent: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeConfigOpen, setNodeConfigOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('New Workflow');
  const { project } = useReactFlow();

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const addNode = (type: string) => {
    const id = `node-${Date.now()}`;
    const position = project({ x: 250, y: 250 });
    
    const newNode: Node = {
      id,
      type: 'default',
      position,
      data: {
        label: nodeTypes[type as keyof typeof nodeTypes]?.label || type,
        type,
        config: {}
      },
      style: {
        backgroundColor: nodeTypes[type as keyof typeof nodeTypes]?.color || '#6b7280',
        color: 'white',
        border: '1px solid #374151',
        borderRadius: '8px',
        padding: '10px'
      }
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode(node);
    setNodeConfigOpen(true);
  };

  const updateNodeConfig = (config: any) => {
    if (!selectedNode) return;

    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? { ...node, data: { ...node.data, config } }
          : node
      )
    );
    setNodeConfigOpen(false);
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
  };

  const saveWorkflow = async () => {
    const workflow = {
      name: workflowName,
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.data.type,
        name: node.data.label,
        config: node.data.config,
        position: node.position
      })),
      edges: edges.map(edge => ({
        source: edge.source,
        target: edge.target
      }))
    };

    try {
      const response = await fetch('/api/pipeline/workflows', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(workflow)
      });

      if (response.ok) {
        toast.success('Workflow saved successfully');
      } else {
        toast.error('Failed to save workflow');
      }
    } catch (error) {
      toast.error('Failed to save workflow');
    }
  };

  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      toast.error('Add at least one node to execute the workflow');
      return;
    }

    await saveWorkflow();
    toast.info('Workflow execution started');
  };

  const exportWorkflow = () => {
    const workflow = {
      name: workflowName,
      nodes,
      edges
    };
    
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importWorkflow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workflow = JSON.parse(e.target?.result as string);
        setWorkflowName(workflow.name || 'Imported Workflow');
        setNodes(workflow.nodes || []);
        setEdges(workflow.edges || []);
        toast.success('Workflow imported successfully');
      } catch (error) {
        toast.error('Failed to import workflow');
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="h-[800px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-64"
              placeholder="Workflow name"
            />
          </div>
          <div className="flex space-x-2">
            <label>
              <input
                type="file"
                accept=".json"
                onChange={importWorkflow}
                className="hidden"
              />
              <Button variant="outline" size="sm" asChild>
                <span className="flex items-center cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </span>
              </Button>
            </label>
            <Button variant="outline" size="sm" onClick={exportWorkflow}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={saveWorkflow}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button size="sm" onClick={executeWorkflow}>
              <Play className="w-4 h-4 mr-2" />
              Execute
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative h-[calc(100%-80px)]">
        <div className="absolute top-4 left-4 z-10 space-y-2">
          <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-2 space-y-1">
            {Object.entries(nodeTypes).map(([type, { label, color }]) => (
              <Button
                key={type}
                size="sm"
                variant="ghost"
                className="w-full justify-start"
                onClick={() => addNode(type)}
                style={{ color }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {label}
              </Button>
            ))}
          </div>
        </div>
        
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>

        {/* Node Configuration Dialog */}
        <Dialog open={nodeConfigOpen} onOpenChange={setNodeConfigOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Node: {selectedNode?.data.label}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Node Name</Label>
                <Input
                  value={selectedNode?.data.label || ''}
                  onChange={(e) => {
                    if (selectedNode) {
                      setNodes((nds) =>
                        nds.map((node) =>
                          node.id === selectedNode.id
                            ? { ...node, data: { ...node.data, label: e.target.value } }
                            : node
                        )
                      );
                    }
                  }}
                />
              </div>
              
              <div>
                <Label>Configuration (JSON)</Label>
                <Textarea
                  rows={10}
                  value={JSON.stringify(selectedNode?.data.config || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const config = JSON.parse(e.target.value);
                      if (selectedNode) {
                        setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, config } });
                      }
                    } catch (error) {
                      // Invalid JSON, ignore
                    }
                  }}
                  placeholder="Enter configuration as JSON"
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-between">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (selectedNode) {
                      deleteNode(selectedNode.id);
                      setNodeConfigOpen(false);
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Node
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={() => setNodeConfigOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedNode) {
                        updateNodeConfig(selectedNode.data.config);
                      }
                    }}
                  >
                    Save Configuration
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

const WorkflowBuilder: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;