import { Socket, Namespace } from 'socket.io';
import { logger } from '@/utils/logger';
import { prisma } from '@/utils/database';
import { redis } from '@/utils/redis';

const log = logger.child({ context: 'WebSocket:Handlers' });

export function setupHandlers(socket: Socket, namespace: Namespace) {
  const userId = (socket as any).userId;

  // System status
  socket.on('system:status', async (callback) => {
    try {
      const status = await getSystemStatus();
      callback({ success: true, data: status });
    } catch (error) {
      log.error('Error getting system status:', error);
      callback({ success: false, error: error.message });
    }
  });

  // User notifications
  socket.on('notifications:subscribe', async () => {
    socket.join(`notifications:${userId}`);
    
    // Send unread notifications
    const unreadNotifications = await getUnreadNotifications(userId);
    socket.emit('notifications:unread', unreadNotifications);
  });

  socket.on('notifications:mark_read', async (notificationIds: string[]) => {
    try {
      await markNotificationsAsRead(userId, notificationIds);
      socket.emit('notifications:marked_read', { ids: notificationIds });
    } catch (error) {
      log.error('Error marking notifications as read:', error);
      socket.emit('error', { message: 'Failed to mark notifications as read' });
    }
  });

  // Real-time metrics
  socket.on('metrics:subscribe', async (metricTypes: string[]) => {
    if (!(socket as any).user.role === 'ADMIN') {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }

    metricTypes.forEach(type => {
      socket.join(`metrics:${type}`);
    });

    // Start sending metrics
    startMetricsStream(socket, metricTypes);
  });

  socket.on('metrics:unsubscribe', (metricTypes: string[]) => {
    metricTypes.forEach(type => {
      socket.leave(`metrics:${type}`);
    });
  });

  // Task monitoring
  socket.on('tasks:subscribe', () => {
    socket.join(`tasks:${userId}`);
  });

  socket.on('tasks:cancel', async (taskId: string) => {
    try {
      await cancelTask(userId, taskId);
      socket.emit('task:cancelled', { taskId });
    } catch (error) {
      log.error('Error cancelling task:', error);
      socket.emit('error', { message: 'Failed to cancel task' });
    }
  });

  // Agent monitoring
  socket.on('agents:monitor', async (agentIds: string[]) => {
    for (const agentId of agentIds) {
      const hasAccess = await verifyAgentAccess(userId, agentId);
      if (hasAccess) {
        socket.join(`agent:monitor:${agentId}`);
        
        // Send current agent status
        const status = await getAgentStatus(agentId);
        socket.emit('agent:status', { agentId, status });
      }
    }
  });

  // Custom events
  socket.on('custom:event', async (data) => {
    try {
      // Validate and process custom events
      await processCustomEvent(userId, data);
      socket.emit('custom:event:ack', { eventId: data.id });
    } catch (error) {
      log.error('Error processing custom event:', error);
      socket.emit('error', { message: 'Failed to process event' });
    }
  });
}

async function getSystemStatus() {
  const [dbStatus, redisStatus, activeAgents, pendingTasks] = await Promise.all([
    checkDatabaseStatus(),
    checkRedisStatus(),
    getActiveAgentsCount(),
    getPendingTasksCount(),
  ]);

  return {
    database: dbStatus,
    redis: redisStatus,
    agents: {
      active: activeAgents,
    },
    tasks: {
      pending: pendingTasks,
    },
    timestamp: new Date().toISOString(),
  };
}

async function checkDatabaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkRedisStatus() {
  try {
    await redis.ping();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function getActiveAgentsCount() {
  return await prisma.agent.count({
    where: { status: 'ACTIVE' },
  });
}

async function getPendingTasksCount() {
  return await prisma.task.count({
    where: { status: 'PENDING' },
  });
}

async function getUnreadNotifications(userId: string) {
  // This is a placeholder - implement based on your notification system
  return [];
}

async function markNotificationsAsRead(userId: string, notificationIds: string[]) {
  // This is a placeholder - implement based on your notification system
}

async function startMetricsStream(socket: Socket, metricTypes: string[]) {
  const intervals: NodeJS.Timeout[] = [];

  if (metricTypes.includes('system')) {
    const interval = setInterval(async () => {
      const metrics = await getSystemMetrics();
      socket.emit('metrics:system', metrics);
    }, 5000); // Every 5 seconds
    intervals.push(interval);
  }

  if (metricTypes.includes('agents')) {
    const interval = setInterval(async () => {
      const metrics = await getAgentMetrics();
      socket.emit('metrics:agents', metrics);
    }, 10000); // Every 10 seconds
    intervals.push(interval);
  }

  // Clean up intervals on disconnect
  socket.on('disconnect', () => {
    intervals.forEach(interval => clearInterval(interval));
  });
}

async function getSystemMetrics() {
  const metrics = await redis.hgetall('app:metrics');
  return {
    ...metrics,
    timestamp: new Date().toISOString(),
  };
}

async function getAgentMetrics() {
  const agents = await prisma.agent.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      lastHeartbeat: true,
      _count: {
        select: {
          messages: true,
          tasks: true,
        },
      },
    },
  });

  return agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    lastHeartbeat: agent.lastHeartbeat,
    messageCount: agent._count.messages,
    taskCount: agent._count.tasks,
  }));
}

async function cancelTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
      status: { in: ['PENDING', 'QUEUED', 'RUNNING'] },
    },
  });

  if (!task) {
    throw new Error('Task not found or cannot be cancelled');
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: 'CANCELLED',
      completedAt: new Date(),
    },
  });

  // Publish cancellation event
  await redis.publish('task:cancel', JSON.stringify({ taskId, userId }));
}

async function verifyAgentAccess(userId: string, agentId: string): Promise<boolean> {
  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      OR: [
        { userId },
        { isSystem: true },
      ],
    },
  });

  return !!agent;
}

async function getAgentStatus(agentId: string) {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      status: true,
      lastHeartbeat: true,
    },
  });

  if (!agent) {
    return { status: 'NOT_FOUND' };
  }

  // Get real-time metrics from Redis
  const metrics = await redis.hgetall(`agent:metrics:${agentId}`);

  return {
    status: agent.status,
    lastHeartbeat: agent.lastHeartbeat,
    metrics,
  };
}

async function processCustomEvent(userId: string, data: any) {
  // Validate event structure
  if (!data.type || !data.payload) {
    throw new Error('Invalid event structure');
  }

  // Process based on event type
  switch (data.type) {
    case 'agent_command':
      await processAgentCommand(userId, data.payload);
      break;
    
    case 'workflow_trigger':
      await triggerWorkflow(userId, data.payload);
      break;
    
    default:
      log.warn(`Unknown custom event type: ${data.type}`);
  }
}

async function processAgentCommand(userId: string, payload: any) {
  // Validate user has access to agent
  const hasAccess = await verifyAgentAccess(userId, payload.agentId);
  if (!hasAccess) {
    throw new Error('Access denied');
  }

  // Publish command to agent
  await redis.publish('agent:command', JSON.stringify({
    ...payload,
    userId,
    timestamp: new Date().toISOString(),
  }));
}

async function triggerWorkflow(userId: string, payload: any) {
  // Create workflow task
  await prisma.task.create({
    data: {
      name: payload.workflowName,
      type: 'workflow',
      payload,
      userId,
      status: 'PENDING',
    },
  });
}