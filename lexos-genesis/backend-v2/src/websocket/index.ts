import { Server, Socket } from 'socket.io';
import { logger } from '@/utils/logger';
import { authenticate } from './middleware';
import { setupHandlers } from './handlers';
import { redis, subscriber } from '@/utils/redis';
import { MetricsService } from '@/services/metrics.service';

const log = logger.child({ context: 'WebSocket' });
const metrics = MetricsService.getInstance();

export function setupWebSocket(io: Server) {
  // Middleware
  io.use(authenticate);

  // Namespaces
  const mainNamespace = io.of('/');
  const agentNamespace = io.of('/agents');
  const conversationNamespace = io.of('/conversations');

  // Main namespace handlers
  mainNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    log.info(`User ${userId} connected to main namespace`);
    
    // Update metrics
    metrics.setWebSocketConnections('main', mainNamespace.sockets.size);

    // Join user room
    socket.join(`user:${userId}`);

    // Setup handlers
    setupHandlers(socket, mainNamespace);

    // Handle disconnection
    socket.on('disconnect', () => {
      log.info(`User ${userId} disconnected from main namespace`);
      metrics.setWebSocketConnections('main', mainNamespace.sockets.size);
    });
  });

  // Agent namespace handlers
  agentNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    log.info(`User ${userId} connected to agent namespace`);
    
    metrics.setWebSocketConnections('agents', agentNamespace.sockets.size);

    socket.join(`user:${userId}`);

    // Agent-specific events
    socket.on('subscribe:agent', (agentId: string) => {
      socket.join(`agent:${agentId}`);
      log.debug(`User ${userId} subscribed to agent ${agentId}`);
    });

    socket.on('unsubscribe:agent', (agentId: string) => {
      socket.leave(`agent:${agentId}`);
      log.debug(`User ${userId} unsubscribed from agent ${agentId}`);
    });

    socket.on('agent:command', async (data) => {
      const { agentId, command, payload } = data;
      // Emit to agent control channel
      await redis.publish('agent:control', JSON.stringify({
        action: command,
        agentId,
        payload,
        userId,
      }));
    });

    socket.on('disconnect', () => {
      log.info(`User ${userId} disconnected from agent namespace`);
      metrics.setWebSocketConnections('agents', agentNamespace.sockets.size);
    });
  });

  // Conversation namespace handlers
  conversationNamespace.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    log.info(`User ${userId} connected to conversation namespace`);
    
    metrics.setWebSocketConnections('conversations', conversationNamespace.sockets.size);

    socket.join(`user:${userId}`);

    // Conversation-specific events
    socket.on('join:conversation', async (conversationId: string) => {
      // Verify user has access to conversation
      const hasAccess = await verifyConversationAccess(userId, conversationId);
      if (hasAccess) {
        socket.join(`conversation:${conversationId}`);
        log.debug(`User ${userId} joined conversation ${conversationId}`);
        
        // Notify others in conversation
        socket.to(`conversation:${conversationId}`).emit('user:joined', {
          userId,
          conversationId,
          timestamp: new Date().toISOString(),
        });
      } else {
        socket.emit('error', { message: 'Access denied to conversation' });
      }
    });

    socket.on('leave:conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      log.debug(`User ${userId} left conversation ${conversationId}`);
      
      // Notify others in conversation
      socket.to(`conversation:${conversationId}`).emit('user:left', {
        userId,
        conversationId,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    socket.on('disconnect', () => {
      log.info(`User ${userId} disconnected from conversation namespace`);
      metrics.setWebSocketConnections('conversations', conversationNamespace.sockets.size);
    });
  });

  // Redis subscriptions for real-time updates
  setupRedisSubscriptions(io);
}

function setupRedisSubscriptions(io: Server) {
  // Subscribe to relevant channels
  subscriber.subscribe('agent:message');
  subscriber.subscribe('agent:status');
  subscriber.subscribe('task:update');
  subscriber.subscribe('system:notification');

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      switch (channel) {
        case 'agent:message':
          // Emit to conversation room
          io.of('/conversations')
            .to(`conversation:${data.conversationId}`)
            .emit('message:new', data);
          break;

        case 'agent:status':
          // Emit to agent room
          io.of('/agents')
            .to(`agent:${data.agentId}`)
            .emit('agent:status', data);
          break;

        case 'task:update':
          // Emit to user room
          if (data.userId) {
            io.of('/')
              .to(`user:${data.userId}`)
              .emit('task:update', data);
          }
          break;

        case 'system:notification':
          // Broadcast or emit to specific users
          if (data.broadcast) {
            io.of('/').emit('notification', data);
          } else if (data.userId) {
            io.of('/')
              .to(`user:${data.userId}`)
              .emit('notification', data);
          }
          break;
      }
    } catch (error) {
      log.error(`Error processing Redis message from ${channel}:`, error);
    }
  });
}

async function verifyConversationAccess(userId: string, conversationId: string): Promise<boolean> {
  // Import here to avoid circular dependency
  const { prisma } = await import('@/utils/database');
  
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });

  return !!conversation;
}