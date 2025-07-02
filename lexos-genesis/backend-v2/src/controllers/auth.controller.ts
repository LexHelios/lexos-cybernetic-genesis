import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/utils/database';
import { redis } from '@/utils/redis';
import { config } from '@/config';
import { AppError } from '@/utils/errors';
import { AuthRequest } from '@/middleware/auth';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, password } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        throw new AppError(
          existingUser.email === email
            ? 'Email already registered'
            : 'Username already taken',
          409,
          'USER_EXISTS'
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, config.bcrypt.rounds);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Create session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user || !user.isActive) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Create session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await prisma.session.create({
        data: {
          userId: user.id,
          token,
          expiresAt,
        },
      });

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const token = req.headers.authorization?.substring(7);
      if (!token) {
        throw new AppError('No token provided', 400, 'NO_TOKEN');
      }

      // Delete session
      await prisma.session.delete({
        where: { token },
      });

      // Add token to blacklist
      const decoded = jwt.decode(token) as any;
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redis.setex(`blacklist:${token}`, ttl, '1');
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { token: oldToken } = req.body;
      if (!oldToken) {
        throw new AppError('No token provided', 400, 'NO_TOKEN');
      }

      // Verify old token
      const decoded = jwt.verify(oldToken, config.jwt.secret) as any;

      // Check if session exists
      const session = await prisma.session.findUnique({
        where: { token: oldToken },
        include: { user: true },
      });

      if (!session) {
        throw new AppError('Invalid session', 401, 'INVALID_SESSION');
      }

      // Generate new token
      const newToken = jwt.sign(
        { userId: session.userId },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      // Update session
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await prisma.session.update({
        where: { id: session.id },
        data: {
          token: newToken,
          expiresAt,
        },
      });

      res.json({
        success: true,
        data: {
          token: newToken,
          user: {
            id: session.user.id,
            email: session.user.email,
            username: session.user.username,
            role: session.user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(req: AuthRequest, res: Response, next: NextFunction) {
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
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user!.id;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        throw new AppError('Invalid current password', 401, 'INVALID_PASSWORD');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.rounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      // Invalidate all sessions except current
      const currentToken = req.headers.authorization?.substring(7);
      await prisma.session.deleteMany({
        where: {
          userId,
          NOT: { token: currentToken },
        },
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}