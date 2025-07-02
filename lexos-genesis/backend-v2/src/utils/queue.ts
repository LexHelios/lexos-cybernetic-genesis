import Bull from 'bull';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { TaskProcessor } from '@/services/taskProcessor.service';

const log = logger.child({ context: 'Queue' });

// Queue definitions
export const queues = {
  taskQueue: new Bull('task-queue', {
    redis: {
      host: config.queue.redis.host,
      port: config.queue.redis.port,
    },
  }),
  agentQueue: new Bull('agent-queue', {
    redis: {
      host: config.queue.redis.host,
      port: config.queue.redis.port,
    },
  }),
  notificationQueue: new Bull('notification-queue', {
    redis: {
      host: config.queue.redis.host,
      port: config.queue.redis.port,
    },
  }),
};

// Initialize queues
export async function initializeQueue() {
  try {
    // Task queue processor
    queues.taskQueue.process(config.queue.concurrency, async (job) => {
      log.info(`Processing task job: ${job.id}`, { data: job.data });
      const processor = new TaskProcessor();
      return await processor.process(job.data);
    });

    // Agent queue processor
    queues.agentQueue.process(async (job) => {
      log.info(`Processing agent job: ${job.id}`, { data: job.data });
      // Process agent-related jobs
      const { action, agentId, payload } = job.data;
      // Implementation will be handled by AgentOrchestrator
      return { success: true, action, agentId };
    });

    // Notification queue processor
    queues.notificationQueue.process(async (job) => {
      log.info(`Processing notification job: ${job.id}`, { data: job.data });
      // Process notifications
      return { success: true };
    });

    // Queue event handlers
    Object.entries(queues).forEach(([name, queue]) => {
      queue.on('completed', (job, result) => {
        log.info(`${name} job completed:`, { jobId: job.id, result });
      });

      queue.on('failed', (job, err) => {
        log.error(`${name} job failed:`, { jobId: job.id, error: err.message });
      });

      queue.on('stalled', (job) => {
        log.warn(`${name} job stalled:`, { jobId: job.id });
      });
    });

    log.info('✅ Queues initialized successfully');
  } catch (error) {
    log.error('❌ Queue initialization failed:', error);
    throw error;
  }
}

// Queue utilities
export const queueUtils = {
  // Add task to queue
  async addTask(data: any, options?: Bull.JobOptions) {
    return await queues.taskQueue.add(data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      ...options,
    });
  },

  // Add agent job
  async addAgentJob(data: any, options?: Bull.JobOptions) {
    return await queues.agentQueue.add(data, options);
  },

  // Add notification
  async addNotification(data: any, options?: Bull.JobOptions) {
    return await queues.notificationQueue.add(data, options);
  },

  // Get queue status
  async getQueueStatus(queueName: keyof typeof queues) {
    const queue = queues[queueName];
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
    };
  },

  // Clean completed jobs
  async cleanQueue(queueName: keyof typeof queues, grace: number = 3600000) {
    const queue = queues[queueName];
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  },
};

// Disconnect queues
export async function disconnectQueues() {
  try {
    await Promise.all(
      Object.values(queues).map(queue => queue.close())
    );
    log.info('Queues disconnected');
  } catch (error) {
    log.error('Error disconnecting queues:', error);
  }
}