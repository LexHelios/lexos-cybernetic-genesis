import database from './database.js';

class KnowledgeGraphService {
  constructor() {
    this.nodeTypes = {
      AGENT: 'agent',
      TASK: 'task',
      MEMORY: 'memory',
      USER: 'user',
      MODEL: 'model'
    };
    
    this.edgeTypes = {
      EXECUTES: 'executes',        // Agent -> Task
      CREATED_BY: 'created_by',    // Task -> User
      HAS_MEMORY: 'has_memory',    // Agent -> Memory
      RELATES_TO: 'relates_to',    // Memory -> Memory
      USES_MODEL: 'uses_model',    // Agent -> Model
      COLLABORATES: 'collaborates' // Agent -> Agent
    };
  }

  // Get all nodes and edges for the knowledge graph
  async getKnowledgeGraph(options = {}) {
    const { limit = 1000, nodeTypes = null, edgeTypes = null } = options;
    
    try {
      const nodes = await this.getNodes(nodeTypes, limit);
      const edges = await this.getEdges(edgeTypes, limit);
      
      return {
        nodes,
        edges,
        statistics: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodeTypes: this.countByType(nodes),
          edgeTypes: this.countByType(edges)
        }
      };
    } catch (error) {
      console.error('Error getting knowledge graph:', error);
      throw error;
    }
  }

  // Get nodes from various entities
  async getNodes(nodeTypes, limit) {
    const nodes = [];
    const typesToFetch = nodeTypes || Object.values(this.nodeTypes);
    
    // Fetch agents
    if (typesToFetch.includes(this.nodeTypes.AGENT)) {
      const agents = await database.getAllAgents();
      agents.forEach(agent => {
        nodes.push({
          id: `agent_${agent.agent_id}`,
          label: agent.name,
          type: this.nodeTypes.AGENT,
          properties: {
            status: agent.status,
            personality: agent.personality,
            model: agent.model,
            capabilities: agent.capabilities?.length || 0,
            lastActive: agent.last_active
          }
        });
      });
    }
    
    // Fetch recent tasks
    if (typesToFetch.includes(this.nodeTypes.TASK)) {
      try {
        const tasks = await database.db.all(
          `SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?`,
          [Math.min(limit / 5, 200)]
        );
        
        if (tasks) {
          tasks.forEach(task => {
            nodes.push({
              id: `task_${task.id}`,
              label: `${task.task_type} (${task.status})`,
              type: this.nodeTypes.TASK,
              properties: {
                status: task.status,
                priority: task.priority,
                createdAt: task.created_at,
                completedAt: task.completed_at
              }
            });
          });
        }
      } catch (error) {
        console.log('Tasks table not found, skipping task nodes');
      }
    }
    
    // Fetch memories (limited sample)
    if (typesToFetch.includes(this.nodeTypes.MEMORY)) {
      const memories = await database.db.all(
        `SELECT * FROM agent_memory 
         WHERE importance > 0.7 
         ORDER BY importance DESC, accessed_at DESC 
         LIMIT ?`,
        [Math.min(limit / 10, 100)]
      );
      
      if (memories) {
        memories.forEach(memory => {
          nodes.push({
            id: `memory_${memory.id}`,
            label: memory.content.substring(0, 50) + '...',
            type: this.nodeTypes.MEMORY,
            properties: {
              memoryType: memory.memory_type,
              importance: memory.importance,
              accessCount: memory.access_count,
              createdAt: memory.created_at
            }
          });
        });
      }
    }
    
    // Fetch users
    if (typesToFetch.includes(this.nodeTypes.USER)) {
      const users = await database.db.all(
        `SELECT * FROM users LIMIT ?`,
        [Math.min(limit / 10, 50)]
      );
      
      if (users) {
        users.forEach(user => {
          nodes.push({
            id: `user_${user.id}`,
            label: user.username,
            type: this.nodeTypes.USER,
            properties: {
              role: user.role,
              isOverlord: user.is_overlord,
              lastActive: user.last_active
            }
          });
        });
      }
    }
    
    // Fetch models
    if (typesToFetch.includes(this.nodeTypes.MODEL)) {
      const models = await database.getAllLLMModels();
      models.forEach(model => {
        nodes.push({
          id: `model_${model.model_id}`,
          label: model.name,
          type: this.nodeTypes.MODEL,
          properties: {
            provider: model.provider,
            category: model.category,
            contextLength: model.context_length,
            isAvailable: model.is_available
          }
        });
      });
    }
    
    return nodes;
  }

  // Get edges (relationships) between nodes
  async getEdges(edgeTypes, limit) {
    const edges = [];
    const typesToFetch = edgeTypes || Object.values(this.edgeTypes);
    
    // Agent -> Task relationships
    if (typesToFetch.includes(this.edgeTypes.EXECUTES)) {
      try {
        const agentTasks = await database.db.all(
          `SELECT DISTINCT agent_id, id as task_id FROM tasks 
           WHERE agent_id IS NOT NULL 
           LIMIT ?`,
          [Math.min(limit / 5, 200)]
        );
        
        if (agentTasks) {
          agentTasks.forEach(at => {
            edges.push({
              id: `edge_${at.agent_id}_task_${at.task_id}`,
              source: `agent_${at.agent_id}`,
              target: `task_${at.task_id}`,
              type: this.edgeTypes.EXECUTES,
              properties: {}
            });
          });
        }
      } catch (error) {
        console.log('Tasks table not found, skipping task edges');
      }
    }
    
    // Task -> User relationships
    if (typesToFetch.includes(this.edgeTypes.CREATED_BY)) {
      try {
        const userTasks = await database.db.all(
          `SELECT DISTINCT user_id, id as task_id FROM tasks 
           WHERE user_id IS NOT NULL 
           LIMIT ?`,
          [Math.min(limit / 5, 200)]
        );
        
        if (userTasks) {
          userTasks.forEach(ut => {
            edges.push({
              id: `edge_task_${ut.task_id}_user_${ut.user_id}`,
              source: `task_${ut.task_id}`,
              target: `user_${ut.user_id}`,
              type: this.edgeTypes.CREATED_BY,
              properties: {}
            });
          });
        }
      } catch (error) {
        console.log('Tasks table not found, skipping user-task edges');
      }
    }
    
    // Agent -> Memory relationships
    if (typesToFetch.includes(this.edgeTypes.HAS_MEMORY)) {
      const agentMemories = await database.db.all(
        `SELECT DISTINCT agent_id, id as memory_id FROM agent_memory 
         WHERE importance > 0.7 
         LIMIT ?`,
        [Math.min(limit / 5, 100)]
      );
      
      if (agentMemories) {
        agentMemories.forEach(am => {
          edges.push({
            id: `edge_agent_${am.agent_id}_memory_${am.memory_id}`,
            source: `agent_${am.agent_id}`,
            target: `memory_${am.memory_id}`,
            type: this.edgeTypes.HAS_MEMORY,
            properties: {}
          });
        });
      }
    }
    
    // Agent -> Agent relationships
    if (typesToFetch.includes(this.edgeTypes.COLLABORATES)) {
      const relationships = await database.db.all(
        `SELECT * FROM agent_relationships 
         WHERE strength > 0.5 
         ORDER BY strength DESC 
         LIMIT ?`,
        [Math.min(limit / 5, 50)]
      );
      
      if (relationships) {
        relationships.forEach(rel => {
          edges.push({
            id: `edge_rel_${rel.id}`,
            source: `agent_${rel.agent1_id}`,
            target: `agent_${rel.agent2_id}`,
            type: this.edgeTypes.COLLABORATES,
            properties: {
              strength: rel.strength,
              relationshipType: rel.relationship_type
            }
          });
        });
      }
    }
    
    // Agent -> Model relationships (inferred from agent data)
    if (typesToFetch.includes(this.edgeTypes.USES_MODEL)) {
      const agents = await database.getAllAgents();
      agents.forEach(agent => {
        if (agent.model) {
          edges.push({
            id: `edge_agent_${agent.agent_id}_model_${agent.model}`,
            source: `agent_${agent.agent_id}`,
            target: `model_${agent.model}`,
            type: this.edgeTypes.USES_MODEL,
            properties: {}
          });
        }
      });
    }
    
    return edges;
  }

  // Get subgraph centered on a specific node
  async getNodeSubgraph(nodeId, depth = 1) {
    const nodes = new Map();
    const edges = [];
    const visited = new Set();
    
    // Helper function to add a node
    const addNode = async (id, type) => {
      if (nodes.has(id)) return;
      
      let nodeData = null;
      const [nodeType, entityId] = id.split('_', 2);
      
      switch (nodeType) {
        case 'agent':
          const agent = await database.getAgent(entityId);
          if (agent) {
            nodeData = {
              id,
              label: agent.name,
              type: this.nodeTypes.AGENT,
              properties: {
                status: agent.status,
                personality: agent.personality,
                model: agent.model
              }
            };
          }
          break;
        case 'memory':
          const memory = await database.db.get(
            'SELECT * FROM agent_memory WHERE id = ?',
            [parseInt(entityId)]
          );
          if (memory) {
            nodeData = {
              id,
              label: memory.content.substring(0, 50) + '...',
              type: this.nodeTypes.MEMORY,
              properties: {
                memoryType: memory.memory_type,
                importance: memory.importance
              }
            };
          }
          break;
        // Add other node types as needed
      }
      
      if (nodeData) {
        nodes.set(id, nodeData);
      }
    };
    
    // BFS to explore the graph
    const queue = [[nodeId, 0]];
    visited.add(nodeId);
    
    while (queue.length > 0) {
      const [currentId, currentDepth] = queue.shift();
      
      if (currentDepth > depth) continue;
      
      // Get all edges connected to this node
      const connectedEdges = await this.getConnectedEdges(currentId);
      
      for (const edge of connectedEdges) {
        edges.push(edge);
        
        // Add the other node
        const otherId = edge.source === currentId ? edge.target : edge.source;
        
        if (!visited.has(otherId) && currentDepth < depth) {
          visited.add(otherId);
          queue.push([otherId, currentDepth + 1]);
        }
        
        // Ensure both nodes are in the result
        await addNode(edge.source);
        await addNode(edge.target);
      }
    }
    
    return {
      nodes: Array.from(nodes.values()),
      edges,
      center: nodeId,
      depth
    };
  }

  // Get edges connected to a specific node
  async getConnectedEdges(nodeId) {
    const edges = [];
    const [nodeType, entityId] = nodeId.split('_', 2);
    
    switch (nodeType) {
      case 'agent':
        // Get tasks executed by this agent
        try {
          const tasks = await database.db.all(
            'SELECT id FROM tasks WHERE agent_id = ? LIMIT 20',
            [entityId]
          );
          if (tasks) {
            tasks.forEach(task => {
              edges.push({
                id: `edge_${entityId}_task_${task.id}`,
                source: nodeId,
                target: `task_${task.id}`,
                type: this.edgeTypes.EXECUTES
              });
            });
          }
        } catch (error) {
          console.log('Tasks table not found');
        }
        
        // Get memories for this agent
        const memories = await database.db.all(
          'SELECT id FROM agent_memory WHERE agent_id = ? AND importance > 0.7 LIMIT 10',
          [entityId]
        );
        if (memories) {
          memories.forEach(memory => {
            edges.push({
              id: `edge_${entityId}_memory_${memory.id}`,
              source: nodeId,
              target: `memory_${memory.id}`,
              type: this.edgeTypes.HAS_MEMORY
            });
          });
        }
        
        // Get agent relationships
        const relationships = await database.getAgentRelationships(entityId);
        relationships.forEach(rel => {
          const otherId = rel.agent1_id === entityId ? rel.agent2_id : rel.agent1_id;
          edges.push({
            id: `edge_rel_${rel.id}`,
            source: nodeId,
            target: `agent_${otherId}`,
            type: this.edgeTypes.COLLABORATES,
            properties: {
              strength: rel.strength
            }
          });
        });
        break;
        
      // Add other node types as needed
    }
    
    return edges;
  }

  // Count nodes/edges by type
  countByType(items) {
    const counts = {};
    items.forEach(item => {
      counts[item.type] = (counts[item.type] || 0) + 1;
    });
    return counts;
  }

  // Search nodes by label or properties
  async searchNodes(query, options = {}) {
    const { limit = 50, types = null } = options;
    const allNodes = await this.getNodes(types, limit * 2);
    
    const queryLower = query.toLowerCase();
    const results = allNodes.filter(node => {
      // Search in label
      if (node.label.toLowerCase().includes(queryLower)) return true;
      
      // Search in properties
      const propsString = JSON.stringify(node.properties).toLowerCase();
      return propsString.includes(queryLower);
    });
    
    return results.slice(0, limit);
  }
}

export default new KnowledgeGraphService();