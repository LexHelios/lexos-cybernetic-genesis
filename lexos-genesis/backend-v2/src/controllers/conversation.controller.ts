import { Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { AuthRequest } from '@/middleware/auth';
import { NotFoundError } from '@/utils/errors';
import { redis } from '@/utils/redis';
import { AgentOrchestrator } from '@/agents/orchestrator';

export class ConversationController {
  private orchestrator = AgentOrchestrator.getInstance();

  async getAllConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        userId: req.user!.id,
      };

      if (status) where.status = status;

      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: {
              select: {
                messages: true,
                agents: true,
              },
            },
          },
        }),
        prisma.conversation.count({ where }),
      ]);

      res.json({
        success: true,
        data: conversations,
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

  async getConversationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: req.params.id,
          userId: req.user!.id,
        },
        include: {
          agents: {
            include: {
              agent: true,
            },
          },
          messages: {
            take: 50,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation');
      }

      res.json({
        success: true,
        data: {
          ...conversation,
          messages: conversation.messages.reverse(), // Return in chronological order
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async createConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, agentIds = [] } = req.body;

      const conversation = await prisma.conversation.create({
        data: {
          title,
          userId: req.user!.id,
          agents: {
            create: agentIds.map((agentId: string) => ({
              id: `${req.params.id}_${agentId}`,
              agentId,
            })),
          },
        },
        include: {
          agents: {
            include: {
              agent: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { title } = req.body;

      const conversation = await prisma.conversation.updateMany({
        where: {
          id,
          userId: req.user!.id,
        },
        data: { title },
      });

      if (conversation.count === 0) {
        throw new NotFoundError('Conversation');
      }

      res.json({
        success: true,
        message: 'Conversation updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const conversation = await prisma.conversation.deleteMany({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (conversation.count === 0) {
        throw new NotFoundError('Conversation');
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      // Verify access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation');
      }

      const [messages, total] = await Promise.all([
        prisma.message.findMany({
          where: { conversationId: id },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        }),
        prisma.message.count({ where: { conversationId: id } }),
      ]);

      res.json({
        success: true,
        data: messages.reverse(), // Return in chronological order
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

  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { content, metadata } = req.body;

      // Verify access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
        include: {
          agents: true,
        },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation');
      }

      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          conversationId: id,
          role: 'USER',
          content,
          metadata,
        },
      });

      // Emit to WebSocket
      await redis.publish('agent:message', JSON.stringify({
        conversationId: id,
        message: userMessage,
        userId: req.user!.id,
      }));

      // Send to agents in conversation
      if (conversation.agents.length > 0) {
        for (const conversationAgent of conversation.agents) {
          try {
            const agent = this.orchestrator.getAgentById(conversationAgent.agentId);
            if (agent) {
              // Send message to agent asynchronously
              agent.process({
                type: 'chat',
                conversationId: id,
                content,
                metadata,
              }).catch(err => {
                console.error(`Error processing message with agent ${conversationAgent.agentId}:`, err);
              });
            }
          } catch (error) {
            console.error(`Failed to send message to agent ${conversationAgent.agentId}:`, error);
          }
        }
      }

      res.json({
        success: true,
        data: userMessage,
      });
    } catch (error) {
      next(error);
    }
  }

  async getConversationAgents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation');
      }

      const agents = await prisma.conversationAgent.findMany({
        where: { conversationId: id },
        include: {
          agent: true,
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

  async addAgentToConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, agentId } = req.params;

      // Verify conversation access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation');
      }

      // Verify agent exists and user has access
      const agent = await prisma.agent.findFirst({
        where: {
          id: agentId,
          OR: [
            { userId: req.user!.id },
            { isSystem: true },
          ],
        },
      });

      if (!agent) {
        throw new NotFoundError('Agent');
      }

      const conversationAgent = await prisma.conversationAgent.create({
        data: {
          id: `${id}_${agentId}`,
          conversationId: id,
          agentId,
        },
        include: {
          agent: true,
        },
      });

      res.json({
        success: true,
        data: conversationAgent,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeAgentFromConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, agentId } = req.params;

      // Verify conversation access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id,
          userId: req.user!.id,
        },
      });

      if (!conversation) {
        throw new NotFoundError('Conversation');
      }

      await prisma.conversationAgent.delete({
        where: {
          conversationId_agentId: {
            conversationId: id,
            agentId,
          },
        },
      });

      res.json({
        success: true,
        message: 'Agent removed from conversation',
      });
    } catch (error) {
      next(error);
    }
  }

  async archiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const conversation = await prisma.conversation.updateMany({
        where: {
          id,
          userId: req.user!.id,
        },
        data: { status: 'ARCHIVED' },
      });

      if (conversation.count === 0) {
        throw new NotFoundError('Conversation');
      }

      res.json({
        success: true,
        message: 'Conversation archived successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async restoreConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const conversation = await prisma.conversation.updateMany({
        where: {
          id,
          userId: req.user!.id,
          status: 'ARCHIVED',
        },
        data: { status: 'ACTIVE' },
      });

      if (conversation.count === 0) {
        throw new NotFoundError('Conversation');
      }

      res.json({
        success: true,
        message: 'Conversation restored successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}