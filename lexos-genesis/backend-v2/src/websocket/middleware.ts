import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { prisma } from '@/utils/database';
import { logger } from '@/utils/logger';

const log = logger.child({ context: 'WebSocket:Auth' });

export async function authenticate(socket: Socket, next: (err?: any) => void) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.substring(7);
    
    if (!token) {
      return next(new Error('No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    // Check if session exists
    const session = await prisma.session.findFirst({
      where: {
        userId: user.id,
        token,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return next(new Error('Invalid or expired session'));
    }

    // Attach user info to socket
    (socket as any).userId = user.id;
    (socket as any).user = user;

    log.debug(`User ${user.username} authenticated for WebSocket connection`);
    next();
  } catch (error) {
    log.error('WebSocket authentication error:', error);
    next(new Error('Authentication failed'));
  }
}