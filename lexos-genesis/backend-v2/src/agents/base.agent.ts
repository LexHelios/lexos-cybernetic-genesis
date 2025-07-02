import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/utils/database';
import { redis } from '@/utils/redis';
import { logger } from '@/utils/logger';
import { AgentStatus, AgentType } from '@prisma/client';

export interface AgentConfig {
  id?: string;
  name: string;
  type: AgentType;
  capabilities?: string[];
  config?: any;
  userId?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  schema: any;
  handler: (params: any) => Promise<any>;
}

export interface AgentMemory {
  [key: string]: any;
}

export abstract class BaseAgent extends EventEmitter {
  protected id: string;
  protected name: string;
  protected type: AgentType;
  protected status: AgentStatus = AgentStatus.INACTIVE;
  protected capabilities: string[] = [];
  protected config: any = {};
  protected memory: AgentMemory = {};
  protected tools: Map<string, AgentTool> = new Map();
  protected userId?: string;
  protected logger: ReturnType<typeof logger.child>;
  protected heartbeatInterval?: NodeJS.Timeout;
  protected isShuttingDown = false;

  constructor(config: AgentConfig) {
    super();
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.type = config.type;
    this.capabilities = config.capabilities || [];
    this.config = config.config || {};
    this.userId = config.userId;
    this.logger = logger.child({ context: `Agent:${this.name}` });
  }

  // Lifecycle methods
  async initialize(): Promise<void> {
    try {
      this.logger.info(`Initializing agent ${this.name}`);
      
      // Load from database
      await this.loadFromDatabase();
      
      // Initialize agent-specific resources
      await this.onInitialize();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.status = AgentStatus.ACTIVE;
      await this.updateStatus(AgentStatus.ACTIVE);
      
      this.emit('initialized');
      this.logger.info(`Agent ${this.name} initialized successfully`);
    } catch (error) {
      this.logger.error(`Failed to initialize agent ${this.name}:`, error);
      this.status = AgentStatus.ERROR;
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.isShuttingDown = true;
      this.logger.info(`Shutting down agent ${this.name}`);
      
      // Stop heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
      }
      
      // Save state
      await this.saveToDatabase();
      
      // Cleanup agent-specific resources
      await this.onShutdown();
      
      this.status = AgentStatus.INACTIVE;
      await this.updateStatus(AgentStatus.INACTIVE);
      
      this.emit('shutdown');
      this.logger.info(`Agent ${this.name} shut down successfully`);
    } catch (error) {
      this.logger.error(`Error during agent shutdown:`, error);
      throw error;
    }
  }

  async restart(): Promise<void> {
    await this.shutdown();
    await this.initialize();
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
  abstract process(input: any): Promise<any>;

  // Tool management
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    this.logger.info(`Tool ${tool.name} registered`);
  }

  async executeTool(toolName: string, params: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    try {
      this.logger.debug(`Executing tool ${toolName}`, { params });
      const result = await tool.handler(params);
      this.logger.debug(`Tool ${toolName} executed successfully`, { result });
      return result;
    } catch (error) {
      this.logger.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  getAvailableTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  // Memory management
  async setMemory(key: string, value: any): Promise<void> {
    this.memory[key] = value;
    await this.saveMemory(key, value);
  }

  getMemory(key: string): any {
    return this.memory[key];
  }

  async deleteMemory(key: string): Promise<void> {
    delete this.memory[key];
    await prisma.agentMemory.deleteMany({
      where: { agentId: this.id, key },
    });
  }

  // Capability management
  hasCapability(capability: string): boolean {
    return this.capabilities.includes(capability);
  }

  addCapability(capability: string): void {
    if (!this.hasCapability(capability)) {
      this.capabilities.push(capability);
    }
  }

  removeCapability(capability: string): void {
    this.capabilities = this.capabilities.filter(c => c !== capability);
  }

  // Status and health
  getStatus(): AgentStatus {
    return this.status;
  }

  async getHealth(): Promise<any> {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      capabilities: this.capabilities,
      toolsCount: this.tools.size,
    };
  }

  // Communication
  async sendMessage(conversationId: string, content: string, metadata?: any): Promise<void> {
    await prisma.message.create({
      data: {
        conversationId,
        agentId: this.id,
        role: 'ASSISTANT',
        content,
        metadata,
      },
    });

    // Emit event for real-time updates
    await redis.publish('agent:message', JSON.stringify({
      agentId: this.id,
      conversationId,
      content,
      metadata,
    }));
  }

  // Database operations
  protected async loadFromDatabase(): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id: this.id },
      include: {
        agentMemories: true,
        agentTools: true,
      },
    });

    if (agent) {
      this.capabilities = agent.capabilities as string[];
      this.config = agent.config;
      
      // Load memory
      for (const mem of agent.agentMemories) {
        this.memory[mem.key] = mem.value;
      }
      
      // Load tools
      for (const tool of agent.agentTools) {
        if (tool.isEnabled) {
          // Tools handlers are loaded dynamically
          // This is a placeholder - actual implementation would load from registry
        }
      }
    }
  }

  protected async saveToDatabase(): Promise<void> {
    await prisma.agent.upsert({
      where: { id: this.id },
      update: {
        name: this.name,
        status: this.status,
        capabilities: this.capabilities,
        config: this.config,
        memory: this.memory,
        lastHeartbeat: new Date(),
      },
      create: {
        id: this.id,
        name: this.name,
        type: this.type,
        status: this.status,
        capabilities: this.capabilities,
        config: this.config,
        memory: this.memory,
        userId: this.userId,
      },
    });
  }

  protected async saveMemory(key: string, value: any): Promise<void> {
    await prisma.agentMemory.upsert({
      where: {
        agentId_key: {
          agentId: this.id,
          key,
        },
      },
      update: { value },
      create: {
        agentId: this.id,
        type: 'general',
        key,
        value,
      },
    });
  }

  protected async updateStatus(status: AgentStatus): Promise<void> {
    await prisma.agent.update({
      where: { id: this.id },
      data: { status },
    });
  }

  // Heartbeat
  protected startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await prisma.agent.update({
          where: { id: this.id },
          data: { lastHeartbeat: new Date() },
        });
        
        // Store metrics in Redis
        const metrics = await this.getHealth();
        await redis.hset(`agent:metrics:${this.id}`, {
          ...metrics,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error('Heartbeat error:', error);
      }
    }, 30000); // 30 seconds
  }

  // Logging
  protected log(level: string, message: string, metadata?: any): void {
    const logEntry = {
      level,
      message,
      metadata,
      timestamp: new Date().toISOString(),
    };
    
    // Store in Redis for recent logs
    redis.lpush(`agent:logs:${this.id}`, JSON.stringify(logEntry));
    redis.ltrim(`agent:logs:${this.id}`, 0, 999); // Keep last 1000 logs
    
    // Also log to file
    this.logger[level](message, metadata);
  }
}