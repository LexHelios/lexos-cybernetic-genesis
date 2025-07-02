import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { AuthRequest } from '@/middleware/auth';
import { AppError, NotFoundError } from '@/utils/errors';
import { AgentOrchestrator } from '@/agents/orchestrator';
import { redis } from '@/utils/redis';

export class AgentController {
  private orchestrator = AgentOrchestrator.getInstance();

  async getAllAgents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, type, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        OR: [
          { userId: req.user!.id },
          { isSystem: true },
        ],
      };

      if (type) where.type = type;
      if (status) where.status = status;

      const [agents, total] = await Promise.all([
        prisma.agent.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                messages: true,
                tasks: true,
              },
            },
          },
        }),
        prisma.agent.count({ where }),
      ]);

      res.json({
        success: true,
        data: agents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAgentById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const agent = await prisma.agent.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { userId: req.user!.id },
            { isSystem: true },
          ],
        },
        include: {
          agentMemories: true,
          agentTools: true,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }

  async createAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, description, type, capabilities = [], config = {} } = req.body;

      const agent = await prisma.agent.create({
        data: {
          name,
          description,
          type,
          capabilities,
          config,
          userId: req.user!.id,
        },
      });

      res.status(201).json({
        success: true,
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Check ownership
      const existingAgent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!existingAgent) {
        throw new NotFoundError('Agent');
      }

      const agent = await prisma.agent.update({
        where: { id },
        data: updateData,
      });

      // If agent is running, update it in orchestrator
      if (agent.status === 'ACTIVE') {
        await this.orchestrator.updateAgent(id, updateData);
      }

      res.json({
        success: true,
        data: agent,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check ownership
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      // Stop agent if running
      if (agent.status === 'ACTIVE') {
        await this.orchestrator.stopAgent(id);
      }

      await prisma.agent.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Agent deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async startAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          OR: [
            { userId: req.user!.id },
            { isSystem: true },
          ],
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      await this.orchestrator.startAgent(id);

      res.json({
        success: true,
        message: 'Agent started successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async stopAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          OR: [
            { userId: req.user!.id },
            { isSystem: true },
          ],
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      await this.orchestrator.stopAgent(id);

      res.json({
        success: true,
        message: 'Agent stopped successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async restartAgent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const agent = await prisma.agent.findFirst({
        where: {
          id,
          OR: [
            { userId: req.user!.id },
            { isSystem: true },
          ],
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      await this.orchestrator.restartAgent(id);

      res.json({
        success: true,
        message: 'Agent restarted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAgentMemory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const memories = await prisma.agentMemory.findMany({
        where: {
          agentId: id,
          agent: {
            OR: [
              { userId: req.user!.id },
              { isSystem: true },
            ],
          },
        },
      });

      res.json({
        success: true,
        data: memories,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAgentMemory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { key, value, type = 'general' } = req.body;

      // Check agent ownership
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      const memory = await prisma.agentMemory.upsert({
        where: {
          agentId_key: {
            agentId: id,
            key,
          },
        },
        update: { value, type },
        create: {
          agentId: id,
          key,
          value,
          type,
        },
      });

      res.json({
        success: true,
        data: memory,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAgentMemory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, key } = req.params;

      // Check agent ownership
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      await prisma.agentMemory.delete({
        where: {
          agentId_key: {
            agentId: id,
            key,
          },
        },
      });

      res.json({
        success: true,
        message: 'Memory deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAgentTools(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const tools = await prisma.agentTool.findMany({
        where: {
          agentId: id,
          agent: {
            OR: [
              { userId: req.user!.id },
              { isSystem: true },
            ],
          },
        },
      });

      res.json({
        success: true,
        data: tools,
      });
    } catch (error) {
      next(error);
    }
  }

  async addAgentTool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, description, schema, handler } = req.body;

      // Check agent ownership
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      const tool = await prisma.agentTool.create({
        data: {
          agentId: id,
          name,
          description,
          schema,
          handler,
        },
      });

      res.json({
        success: true,
        data: tool,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateAgentTool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, toolId } = req.params;
      const updateData = req.body;

      // Check agent ownership
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      const tool = await prisma.agentTool.update({
        where: { id: toolId },
        data: updateData,
      });

      res.json({
        success: true,
        data: tool,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteAgentTool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, toolId } = req.params;

      // Check agent ownership
      const agent = await prisma.agent.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      await prisma.agentTool.delete({
        where: { id: toolId },
      });

      res.json({
        success: true,
        message: 'Tool deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAgentMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Get metrics from Redis
      const metrics = await redis.hgetall(`agent:metrics:${id}`);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAgentLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;

      // Get logs from Redis list
      const logs = await redis.lrange(`agent:logs:${id}`, 0, Number(limit) - 1);

      res.json({
        success: true,
        data: logs.map(log => JSON.parse(log)),
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemAgents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const agents = await prisma.agent.findMany({
        where: { isSystem: true },
        include: {
          _count: {
            select: {
              messages: true,
              tasks: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: agents,
      });
    } catch (error) {
      next(error);
    }
  }
}