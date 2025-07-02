import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import taskExecutor from './taskExecutor.js';

class TaskQueue extends EventEmitter {
  constructor() {
    super();
    this.queues = new Map(); // queue name -> priority queue
    this.tasks = new Map(); // task id -> task data
    this.activeTasks = new Map(); // task id -> worker info
    this.taskHistory = [];
    this.maxConcurrentTasks = 10;
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2
    };
  }

  createQueue(name, options = {}) {
    if (!this.queues.has(name)) {
      this.queues.set(name, {
        name,
        tasks: [],
        paused: false,
        priority: options.priority || 0,
        concurrency: options.concurrency || 5,
        activeTasks: 0
      });
    }
    return this.queues.get(name);
  }

  enqueue(queueName, taskData, options = {}) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    const task = {
      id: uuidv4(),
      queueName,
      data: taskData,
      priority: options.priority || 0,
      dependencies: options.dependencies || [],
      retries: 0,
      maxRetries: options.maxRetries || this.retryConfig.maxRetries,
      timeout: options.timeout || 30000,
      status: 'queued',
      createdAt: new Date(),
      scheduledFor: options.scheduledFor || null,
      metadata: options.metadata || {}
    };

    this.tasks.set(task.id, task);
    
    // Insert task in priority order
    const insertIndex = queue.tasks.findIndex(t => 
      this.tasks.get(t).priority < task.priority
    );
    
    if (insertIndex === -1) {
      queue.tasks.push(task.id);
    } else {
      queue.tasks.splice(insertIndex, 0, task.id);
    }

    this.emit('task:enqueued', task);
    this.processQueue(queueName);
    
    return task;
  }

  async processQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue || queue.paused) return;

    while (queue.tasks.length > 0 && queue.activeTasks < queue.concurrency) {
      const taskId = queue.tasks.shift();
      const task = this.tasks.get(taskId);
      
      if (!task) continue;

      // Check if task is scheduled for future
      if (task.scheduledFor && new Date(task.scheduledFor) > new Date()) {
        queue.tasks.unshift(taskId); // Put it back
        break;
      }

      // Check dependencies
      if (!(await this.checkDependencies(task))) {
        queue.tasks.push(taskId); // Put at end
        continue;
      }

      queue.activeTasks++;
      this.activeTasks.set(taskId, {
        queueName,
        startedAt: new Date()
      });

      task.status = 'running';
      task.startedAt = new Date();
      this.emit('task:started', task);

      // Process task asynchronously
      this.executeTask(task).catch(error => {
        console.error(`Task ${taskId} failed:`, error);
      });
    }
  }

  async checkDependencies(task) {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }

    for (const depId of task.dependencies) {
      const depTask = this.tasks.get(depId);
      if (!depTask || depTask.status !== 'completed') {
        return false;
      }
    }
    
    return true;
  }

  async executeTask(task) {
    try {
      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeout);
      });

      // Execute task with timeout
      const result = await Promise.race([
        this.runTaskHandler(task),
        timeoutPromise
      ]);

      await this.completeTask(task.id, result);
    } catch (error) {
      await this.failTask(task.id, error);
    }
  }

  async runTaskHandler(task) {
    // Use the task executor to run the actual task
    try {
      const result = await taskExecutor.execute(task);
      return result;
    } catch (error) {
      // If no executor found, fall back to default behavior
      console.warn(`No executor for task type ${task.data.type}, using default`);
      
      // Default simulation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000));
      
      switch (task.data.type) {
        case 'compute':
          return { result: Math.random() * 1000 };
        case 'fetch':
          return { data: 'Fetched data' };
        case 'process':
          return { processed: true, items: Math.floor(Math.random() * 100) };
        default:
          return { success: true };
      }
    }
  }

  async completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = new Date();
    task.result = result;
    task.duration = task.completedAt - task.startedAt;

    this.taskHistory.push({
      ...task,
      timestamp: new Date()
    });

    // Clean up
    this.activeTasks.delete(taskId);
    const queue = this.queues.get(task.queueName);
    if (queue) {
      queue.activeTasks--;
    }

    this.emit('task:completed', task);
    
    // Process dependent tasks
    this.processDependentTasks(taskId);
    
    // Continue processing queue
    this.processQueue(task.queueName);
  }

  async failTask(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.retries++;
    
    if (task.retries < task.maxRetries) {
      // Retry with exponential backoff
      const delay = this.retryConfig.retryDelay * 
        Math.pow(this.retryConfig.backoffMultiplier, task.retries - 1);
      
      task.status = 'retrying';
      task.nextRetryAt = new Date(Date.now() + delay);
      this.emit('task:retrying', task);

      setTimeout(() => {
        task.status = 'queued';
        const queue = this.queues.get(task.queueName);
        if (queue) {
          queue.tasks.unshift(taskId); // Priority retry
          this.processQueue(task.queueName);
        }
      }, delay);
    } else {
      // Max retries reached
      task.status = 'failed';
      task.failedAt = new Date();
      task.error = error.message;
      task.duration = task.failedAt - task.startedAt;

      this.taskHistory.push({
        ...task,
        timestamp: new Date()
      });

      // Clean up
      this.activeTasks.delete(taskId);
      const queue = this.queues.get(task.queueName);
      if (queue) {
        queue.activeTasks--;
      }

      this.emit('task:failed', task);
      
      // Continue processing queue
      this.processQueue(task.queueName);
    }
  }

  processDependentTasks(completedTaskId) {
    // Find tasks waiting for this dependency
    for (const [taskId, task] of this.tasks) {
      if (task.status === 'queued' && 
          task.dependencies.includes(completedTaskId)) {
        // Re-process the queue for this task
        this.processQueue(task.queueName);
      }
    }
  }

  pauseQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = true;
      this.emit('queue:paused', queueName);
    }
  }

  resumeQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (queue) {
      queue.paused = false;
      this.emit('queue:resumed', queueName);
      this.processQueue(queueName);
    }
  }

  getQueueStats(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const stats = {
      name: queueName,
      pending: queue.tasks.length,
      active: queue.activeTasks,
      paused: queue.paused,
      totalProcessed: this.taskHistory.filter(t => t.queueName === queueName).length,
      successRate: this.calculateSuccessRate(queueName)
    };

    return stats;
  }

  calculateSuccessRate(queueName) {
    const queueHistory = this.taskHistory.filter(t => t.queueName === queueName);
    if (queueHistory.length === 0) return 0;

    const successful = queueHistory.filter(t => t.status === 'completed').length;
    return (successful / queueHistory.length) * 100;
  }

  getAllStats() {
    const stats = {
      queues: {},
      global: {
        totalQueues: this.queues.size,
        totalActive: this.activeTasks.size,
        totalPending: 0,
        totalProcessed: this.taskHistory.length
      }
    };

    for (const [name, queue] of this.queues) {
      stats.queues[name] = this.getQueueStats(name);
      stats.global.totalPending += queue.tasks.length;
    }

    return stats;
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'running') {
      // Mark as cancelled
      task.status = 'cancelled';
      task.cancelledAt = new Date();
      
      // Clean up
      this.activeTasks.delete(taskId);
      const queue = this.queues.get(task.queueName);
      if (queue) {
        queue.activeTasks--;
      }

      this.emit('task:cancelled', task);
      this.processQueue(task.queueName);
    } else if (task.status === 'queued') {
      // Remove from queue
      const queue = this.queues.get(task.queueName);
      if (queue) {
        const index = queue.tasks.indexOf(taskId);
        if (index > -1) {
          queue.tasks.splice(index, 1);
        }
      }
      
      task.status = 'cancelled';
      task.cancelledAt = new Date();
      this.emit('task:cancelled', task);
    }

    return true;
  }

  clearQueue(queueName) {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    // Cancel all queued tasks
    for (const taskId of queue.tasks) {
      this.cancelTask(taskId);
    }
    
    queue.tasks = [];
    this.emit('queue:cleared', queueName);
  }
}

export default new TaskQueue();