import { BaseAgent } from './base.agent';
import { prisma } from '@/utils/database';
import { redis, publisher, subscriber } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { queueUtils } from '@/utils/queue';
import { AgentStatus } from '@prisma/client';
import { SystemAgent } from './system.agent';
import { AssistantAgent } from './assistant.agent';
import { CoordinatorAgent } from './coordinator.agent';

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private agents: Map<string, BaseAgent> = new Map();
  private logger = logger.child({ context: 'AgentOrchestrator' });
  private isInitialized = false;

  private constructor() {}

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.logger.info('Initializing Agent Orchestrator');

      // Subscribe to agent events
      this.setupEventHandlers();

      // Load system agents
      await this.loadSystemAgents();

      // Load active user agents
      await this.loadActiveAgents();

      this.isInitialized = true;
      this.logger.info('Agent Orchestrator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Agent Orchestrator:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Agent Orchestrator');

    // Shutdown all agents
    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.shutdown().catch(err => 
        this.logger.error(`Error shutting down agent ${agent.id}:`, err)
      )
    );

    await Promise.all(shutdownPromises);
    this.agents.clear();
    this.isInitialized = false;
  }

  // Agent lifecycle management
  async startAgent(agentId: string): Promise<void> {
    try {
      // Check if agent is already running
      if (this.agents.has(agentId)) {
        this.logger.info(`Agent ${agentId} is already running`);
        return;
      }

      // Load agent from database
      const agentData = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agentData) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Create agent instance
      const agent = this.createAgentInstance(agentData);
      
      // Initialize agent
      await agent.initialize();
      
      // Register agent
      this.agents.set(agentId, agent);
      
      this.logger.info(`Agent ${agentId} started successfully`);
    } catch (error) {
      this.logger.error(`Failed to start agent ${agentId}:`, error);
      throw error;
    }
  }

  async stopAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      this.logger.warn(`Agent ${agentId} is not running`);
      return;
    }

    await agent.shutdown();
    this.agents.delete(agentId);
    this.logger.info(`Agent ${agentId} stopped successfully`);
  }

  async restartAgent(agentId: string): Promise<void> {
    await this.stopAgent(agentId);
    await this.startAgent(agentId);
  }

  async updateAgent(agentId: string, updates: any): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} is not running`);
    }

    // Update agent configuration
    // This is a simplified version - actual implementation would handle specific updates
    await agent.restart();
  }

  // Agent communication
  async sendMessageToAgent(agentId: string, message: any): Promise<any> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} is not available`);
    }

    return await agent.process(message);
  }

  async broadcastMessage(message: any, filter?: (agent: BaseAgent) => boolean): Promise<void> {
    const targetAgents = filter 
      ? Array.from(this.agents.values()).filter(filter)
      : Array.from(this.agents.values());

    const promises = targetAgents.map(agent =>
      agent.process(message).catch(err =>
        this.logger.error(`Error broadcasting to agent ${agent.id}:`, err)
      )
    );

    await Promise.all(promises);
  }

  // Multi-agent coordination
  async coordinateTask(task: any): Promise<any> {
    // Find coordinator agent
    const coordinator = Array.from(this.agents.values()).find(
      agent => agent.hasCapability('coordination')
    );

    if (!coordinator) {
      throw new Error('No coordinator agent available');
    }

    return await coordinator.process({
      type: 'coordinate_task',
      task,
      availableAgents: this.getAvailableAgents(),
    });
  }

  // Agent discovery
  getRunningAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  getAgentById(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAvailableAgents(): any[] {
    return Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.getStatus(),
      capabilities: agent.capabilities,
    }));
  }

  getAgentsByCapability(capability: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent =>
      agent.hasCapability(capability)
    );
  }

  // Private methods
  private createAgentInstance(agentData: any): BaseAgent {
    const config = {
      id: agentData.id,
      name: agentData.name,
      type: agentData.type,
      capabilities: agentData.capabilities,
      config: agentData.config,
      userId: agentData.userId,
    };

    switch (agentData.type) {
      case 'SYSTEM':
        return new SystemAgent(config);
      case 'ASSISTANT':
        return new AssistantAgent(config);
      case 'COORDINATOR':
        return new CoordinatorAgent(config);
      default:
        // For custom agents, dynamically load the agent class
        // This is a placeholder - actual implementation would use a registry
        return new AssistantAgent(config);
    }
  }

  private async loadSystemAgents(): Promise<void> {
    const systemAgents = await prisma.agent.findMany({
      where: { isSystem: true },
    });

    for (const agentData of systemAgents) {
      try {
        await this.startAgent(agentData.id);
      } catch (error) {
        this.logger.error(`Failed to load system agent ${agentData.id}:`, error);
      }
    }
  }

  private async loadActiveAgents(): Promise<void> {
    const activeAgents = await prisma.agent.findMany({
      where: {
        status: AgentStatus.ACTIVE,
        isSystem: false,
      },
    });

    for (const agentData of activeAgents) {
      try {
        await this.startAgent(agentData.id);
      } catch (error) {
        this.logger.error(`Failed to load active agent ${agentData.id}:`, error);
      }
    }
  }

  private setupEventHandlers(): void {
    // Subscribe to agent control channel
    subscriber.subscribe('agent:control');
    subscriber.on('message', async (channel, message) => {
      if (channel === 'agent:control') {
        try {
          const { action, agentId, payload } = JSON.parse(message);
          
          switch (action) {
            case 'start':
              await this.startAgent(agentId);
              break;
            case 'stop':
              await this.stopAgent(agentId);
              break;
            case 'restart':
              await this.restartAgent(agentId);
              break;
            case 'update':
              await this.updateAgent(agentId, payload);
              break;
          }
        } catch (error) {
          this.logger.error('Error handling agent control message:', error);
        }
      }
    });

    // Monitor agent health
    setInterval(async () => {
      await this.checkAgentHealth();
    }, 60000); // Every minute
  }

  private async checkAgentHealth(): Promise<void> {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [agentId, agent] of this.agents) {
      try {
        const agentData = await prisma.agent.findUnique({
          where: { id: agentId },
          select: { lastHeartbeat: true },
        });

        if (agentData?.lastHeartbeat) {
          const lastHeartbeat = new Date(agentData.lastHeartbeat);
          if (now.getTime() - lastHeartbeat.getTime() > timeout) {
            this.logger.warn(`Agent ${agentId} appears to be unresponsive`);
            await this.restartAgent(agentId);
          }
        }
      } catch (error) {
        this.logger.error(`Error checking health for agent ${agentId}:`, error);
      }
    }
  }
}