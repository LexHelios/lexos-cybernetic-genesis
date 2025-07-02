import { Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { AuthRequest } from '@/middleware/auth';
import { NotFoundError, AppError } from '@/utils/errors';
import { queueUtils } from '@/utils/queue';
import { TaskStatus } from '@prisma/client';

export class TaskController {
  async getAllTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, status, type, parentId } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        OR: [
          { userId: req.user!.id },
          { userId: null }, // System tasks
        ],
      };

      if (status) where.status = status;
      if (type) where.type = type;
      if (parentId) where.parentId = parentId;

      const [tasks, total] = await Promise.all([
        prisma.task.findMany({
          where,
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
            _count: {
              select: {
                subtasks: true,
              },
            },
          },
        }),
        prisma.task.count({ where }),
      ]);

      res.json({
        success: true,
        data: tasks,
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

  async getTaskById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await prisma.task.findFirst({
        where: {
          id: req.params.id,
          OR: [
            { userId: req.user!.id },
            { userId: null },
          ],
        },
        include: {
          agent: true,
          subtasks: {
            include: {
              agent: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          parent: true,
        },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async createTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        name,
        description,
        type,
        priority = 0,
        payload,
        agentId,
        scheduledAt,
      } = req.body;

      const task = await prisma.task.create({
        data: {
          name,
          description,
          type,
          priority,
          payload,
          userId: req.user!.id,
          agentId,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? TaskStatus.PENDING : TaskStatus.QUEUED,
        },
      });

      // Queue task for execution
      if (!scheduledAt) {
        await queueUtils.addTask({
          taskId: task.id,
          type,
          payload,
        }, {
          priority,
        });
      } else {
        // Schedule task
        const delay = new Date(scheduledAt).getTime() - Date.now();
        if (delay > 0) {
          await queueUtils.addTask({
            taskId: task.id,
            type,
            payload,
          }, {
            delay,
            priority,
          });
        }
      }

      res.status(201).json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verify ownership
      const existingTask = await prisma.task.findFirst({
        where: {
          id,
          userId: req.user!.id,
          status: { in: [TaskStatus.PENDING, TaskStatus.QUEUED] },
        },
      });

      if (!existingTask) {
        throw new NotFoundError('Task');
      }

      const task = await prisma.task.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify ownership and status
      const task = await prisma.task.findFirst({
        where: {
          id,
          userId: req.user!.id,
          status: { in: [TaskStatus.PENDING, TaskStatus.QUEUED] },
        },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      await prisma.task.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const task = await prisma.task.findFirst({
        where: {
          id,
          userId: req.user!.id,
          status: { in: [TaskStatus.PENDING, TaskStatus.QUEUED, TaskStatus.RUNNING] },
        },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      await prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.CANCELLED,
          completedAt: new Date(),
        },
      });

      // TODO: Cancel from queue if queued

      res.json({
        success: true,
        message: 'Task cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async retryTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const task = await prisma.task.findFirst({
        where: {
          id,
          userId: req.user!.id,
          status: TaskStatus.FAILED,
        },
      });

      if (!task) {
        throw new NotFoundError('Task');
      }

      // Reset task status
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.QUEUED,
          error: null,
          startedAt: null,
          completedAt: null,
        },
      });

      // Re-queue task
      await queueUtils.addTask({
        taskId: task.id,
        type: task.type,
        payload: task.payload,
      }, {
        priority: task.priority,
      });

      res.json({
        success: true,
        data: updatedTask,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSubtasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify parent task access
      const parentTask = await prisma.task.findFirst({
        where: {
          id,
          OR: [
            { userId: req.user!.id },
            { userId: null },
          ],
        },
      });

      if (!parentTask) {
        throw new NotFoundError('Task');
      }

      const subtasks = await prisma.task.findMany({
        where: { parentId: id },
        orderBy: { createdAt: 'asc' },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: subtasks,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueueStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const statuses = await Promise.all([
        queueUtils.getQueueStatus('taskQueue'),
        queueUtils.getQueueStatus('agentQueue'),
        queueUtils.getQueueStatus('notificationQueue'),
      ]);

      res.json({
        success: true,
        data: statuses,
      });
    } catch (error) {
      next(error);
    }
  }

  async cleanQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { queue, grace = 3600000 } = req.body; // Default 1 hour

      if (!['taskQueue', 'agentQueue', 'notificationQueue'].includes(queue)) {
        throw new AppError('Invalid queue name', 400, 'INVALID_QUEUE');
      }

      await queueUtils.cleanQueue(queue as any, Number(grace));

      res.json({
        success: true,
        message: `Queue ${queue} cleaned successfully`,
      });
    } catch (error) {
      next(error);
    }
  }
}