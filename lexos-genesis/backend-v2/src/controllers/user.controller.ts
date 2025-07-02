import { Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { AuthRequest } from '@/middleware/auth';
import { AppError, NotFoundError } from '@/utils/errors';

export class UserController {
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              agents: true,
              conversations: true,
              tasks: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { username, email } = req.body;
      const userId = req.user!.id;

      // Check if username/email already taken
      if (username || email) {
        const existing = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: userId } },
              {
                OR: [
                  username ? { username } : {},
                  email ? { email } : {},
                ],
              },
            ],
          },
        });

        if (existing) {
          throw new AppError(
            existing.username === username
              ? 'Username already taken'
              : 'Email already in use',
            409,
            'DUPLICATE_VALUE'
          );
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(username && { username }),
          ...(email && { email }),
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          updatedAt: true,
        },
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 20, role, isActive } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {};
      if (role) where.role = role;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                agents: true,
                conversations: true,
                tasks: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        data: users,
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

  async getUserById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              agents: true,
              conversations: true,
              tasks: true,
              sessions: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (id === req.user!.id) {
        throw new AppError('Cannot update your own status', 400, 'INVALID_OPERATION');
      }

      const user = await prisma.user.update({
        where: { id },
        data: { isActive },
        select: {
          id: true,
          email: true,
          username: true,
          isActive: true,
        },
      });

      // If deactivating user, invalidate their sessions
      if (!isActive) {
        await prisma.session.deleteMany({
          where: { userId: id },
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        throw new AppError('Cannot delete your own account', 400, 'INVALID_OPERATION');
      }

      // Soft delete by deactivating
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });

      // Delete all sessions
      await prisma.session.deleteMany({
        where: { userId: id },
      });

      res.json({
        success: true,
        message: 'User deactivated successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}