import enhancedAgentManager from './enhancedAgentManager.js';

class WebSocketManager {
  constructor() {
    this.clients = new Map();
    this.agentSubscriptions = new Map();
  }

  handleConnection(ws, req) {
    const clientId = this.generateClientId();
    
    // Store client connection
    this.clients.set(clientId, {
      ws,
      subscriptions: new Set(),
      connectedAt: Date.now()
    });

    console.log(`WebSocket client connected: ${clientId}`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      clientId,
      message: 'Connected to LexOS WebSocket server',
      timestamp: Date.now()
    });

    // Handle messages
    ws.on('message', (message) => {
      this.handleMessage(clientId, message);
    });

    // Handle disconnect
    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
    });
  }

  handleMessage(clientId, message) {
    try {
      const data = JSON.parse(message);
      console.log(`WebSocket message from ${clientId}:`, data);

      switch (data.type) {
        case 'subscribe_agent':
          this.subscribeToAgent(clientId, data.agentId);
          break;
        
        case 'unsubscribe_agent':
          this.unsubscribeFromAgent(clientId, data.agentId);
          break;
        
        case 'subscribe_all_agents':
          this.subscribeToAllAgents(clientId);
          break;
        
        case 'execute_agent_task':
          this.executeAgentTask(clientId, data);
          break;
        
        case 'get_agent_status':
          this.sendAgentStatus(clientId, data.agentId);
          break;
        
        case 'get_all_agents_status':
          this.sendAllAgentsStatus(clientId);
          break;
        
        case 'ping':
          this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
          break;
        
        default:
          this.sendToClient(clientId, {
            type: 'error',
            message: `Unknown message type: ${data.type}`
          });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  subscribeToAgent(clientId, agentId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(agentId);
    
    if (!this.agentSubscriptions.has(agentId)) {
      this.agentSubscriptions.set(agentId, new Set());
    }
    this.agentSubscriptions.get(agentId).add(clientId);

    this.sendToClient(clientId, {
      type: 'subscribed',
      agentId,
      message: `Subscribed to agent ${agentId} updates`
    });

    // Send current agent status
    this.sendAgentStatus(clientId, agentId);
  }

  unsubscribeFromAgent(clientId, agentId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(agentId);
    
    const agentSubs = this.agentSubscriptions.get(agentId);
    if (agentSubs) {
      agentSubs.delete(clientId);
    }

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      agentId,
      message: `Unsubscribed from agent ${agentId} updates`
    });
  }

  subscribeToAllAgents(clientId) {
    const agents = enhancedAgentManager.getAllAgents();
    agents.forEach(agent => {
      this.subscribeToAgent(clientId, agent.id);
    });
  }

  async executeAgentTask(clientId, data) {
    const { agentId, task } = data;
    
    // Send task started notification
    this.broadcastToAgentSubscribers(agentId, {
      type: 'agent_task_started',
      agentId,
      task: {
        id: Date.now().toString(),
        type: task.type,
        status: 'started'
      }
    });

    try {
      // Execute the task
      const result = await enhancedAgentManager.executeOnAgent(agentId, task);
      
      // Send task completed notification
      this.broadcastToAgentSubscribers(agentId, {
        type: 'agent_task_completed',
        agentId,
        task: {
          id: Date.now().toString(),
          type: task.type,
          status: 'completed',
          result
        }
      });

      // Send result to requesting client
      this.sendToClient(clientId, {
        type: 'task_result',
        agentId,
        result
      });
    } catch (error) {
      // Send error notification
      this.broadcastToAgentSubscribers(agentId, {
        type: 'agent_task_failed',
        agentId,
        task: {
          id: Date.now().toString(),
          type: task.type,
          status: 'failed',
          error: error.message
        }
      });

      this.sendToClient(clientId, {
        type: 'task_error',
        agentId,
        error: error.message
      });
    }
  }

  sendAgentStatus(clientId, agentId) {
    const agent = enhancedAgentManager.getAgent(agentId);
    if (!agent) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `Agent ${agentId} not found`
      });
      return;
    }

    this.sendToClient(clientId, {
      type: 'agent_status',
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        currentModel: agent.currentModel,
        metrics: agent.metrics || {},
        capabilities: agent.capabilities
      }
    });
  }

  sendAllAgentsStatus(clientId) {
    const agents = enhancedAgentManager.getAllAgents();
    const agentStatuses = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      currentModel: agent.currentModel,
      metrics: agent.metrics || {},
      capabilities: agent.capabilities
    }));

    this.sendToClient(clientId, {
      type: 'all_agents_status',
      agents: agentStatuses
    });
  }

  broadcastToAgentSubscribers(agentId, message) {
    const subscribers = this.agentSubscriptions.get(agentId);
    if (!subscribers) return;

    subscribers.forEach(clientId => {
      this.sendToClient(clientId, message);
    });
  }

  broadcastToAll(message) {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== 1) return;

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
    }
  }

  handleDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all agent subscriptions
    client.subscriptions.forEach(agentId => {
      const agentSubs = this.agentSubscriptions.get(agentId);
      if (agentSubs) {
        agentSubs.delete(clientId);
      }
    });

    // Remove client
    this.clients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Method to notify about agent status changes
  notifyAgentStatusChange(agentId, newStatus) {
    this.broadcastToAgentSubscribers(agentId, {
      type: 'agent_status_changed',
      agentId,
      status: newStatus,
      timestamp: Date.now()
    });
  }

  // Method to send agent metrics updates
  notifyAgentMetricsUpdate(agentId, metrics) {
    this.broadcastToAgentSubscribers(agentId, {
      type: 'agent_metrics_updated',
      agentId,
      metrics,
      timestamp: Date.now()
    });
  }
}

export default new WebSocketManager();