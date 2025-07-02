import { prisma } from '@/utils/database';
import { logger } from '@/utils/logger';
import { AgentOrchestrator } from '@/agents/orchestrator';
import { queueUtils } from '@/utils/queue';
import { TaskStatus } from '@prisma/client';

export class TaskProcessor {
  private logger = logger.child({ context: 'TaskProcessor' });
  private orchestrator = AgentOrchestrator.getInstance();

  async process(taskData: any): Promise<any> {
    const { taskId, type, payload } = taskData;
    
    try {
      // Update task status
      await this.updateTaskStatus(taskId, TaskStatus.RUNNING);
      
      // Process based on task type
      let result;
      switch (type) {
        case 'agent_task':
          result = await this.processAgentTask(taskId, payload);
          break;
        
        case 'workflow':
          result = await this.processWorkflow(taskId, payload);
          break;
        
        case 'scheduled':
          result = await this.processScheduledTask(taskId, payload);
          break;
        
        case 'batch':
          result = await this.processBatchTask(taskId, payload);
          break;
        
        default:
          throw new Error(`Unknown task type: ${type}`);
      }
      
      // Update task with result
      await this.completeTask(taskId, result);
      
      return result;
    } catch (error) {
      this.logger.error(`Error processing task ${taskId}:`, error);
      await this.failTask(taskId, error.message);
      throw error;
    }
  }

  private async processAgentTask(taskId: string, payload: any): Promise<any> {
    const { agentId, action, data } = payload;
    
    // Send task to specific agent
    const result = await this.orchestrator.sendMessageToAgent(agentId, {
      type: 'task',
      taskId,
      action,
      data,
    });
    
    return result;
  }

  private async processWorkflow(taskId: string, payload: any): Promise<any> {
    const { workflow, context } = payload;
    
    // Use coordinator agent to execute workflow
    const coordinatorAgents = this.orchestrator.getAgentsByCapability('coordination');
    if (coordinatorAgents.length === 0) {
      throw new Error('No coordinator agent available for workflow execution');
    }
    
    const coordinator = coordinatorAgents[0];
    const result = await coordinator.process({
      type: 'create_workflow',
      task: {
        ...workflow,
        context,
        taskId,
      },
    });
    
    return result;
  }

  private async processScheduledTask(taskId: string, payload: any): Promise<any> {
    const { schedule, task } = payload;
    
    // Create subtask for actual execution
    const subtask = await prisma.task.create({
      data: {
        name: `${task.name} (Scheduled)`,
        type: task.type,
        payload: task.payload,
        parentId: taskId,
        status: TaskStatus.PENDING,
      },
    });
    
    // Add to queue
    await queueUtils.addTask({
      taskId: subtask.id,
      type: task.type,
      payload: task.payload,
    });
    
    return {
      scheduled: true,
      subtaskId: subtask.id,
      nextRun: this.calculateNextRun(schedule),
    };
  }

  private async processBatchTask(taskId: string, payload: any): Promise<any> {
    const { items, operation, parallel = false } = payload;
    
    if (parallel) {
      // Process items in parallel
      const results = await Promise.allSettled(
        items.map(item => this.processBatchItem(operation, item))
      );
      
      return {
        total: items.length,
        successful: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length,
        results: results.map((r, i) => ({
          item: items[i],
          status: r.status,
          result: r.status === 'fulfilled' ? r.value : r.reason,
        })),
      };
    } else {
      // Process items sequentially
      const results = [];
      for (const item of items) {
        try {
          const result = await this.processBatchItem(operation, item);
          results.push({ item, status: 'success', result });
        } catch (error) {
          results.push({ item, status: 'failed', error: error.message });
        }
      }
      
      return {
        total: items.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      };
    }
  }

  private async processBatchItem(operation: any, item: any): Promise<any> {
    // Process individual batch item based on operation type
    switch (operation.type) {
      case 'transform':
        return await this.transformData(item, operation.config);
      
      case 'validate':
        return await this.validateData(item, operation.schema);
      
      case 'enrich':
        return await this.enrichData(item, operation.sources);
      
      default:
        throw new Error(`Unknown batch operation: ${operation.type}`);
    }
  }

  private async transformData(data: any, config: any): Promise<any> {
    // Implement data transformation logic
    return data; // Placeholder
  }

  private async validateData(data: any, schema: any): Promise<any> {
    // Implement data validation logic
    return { valid: true, data }; // Placeholder
  }

  private async enrichData(data: any, sources: any[]): Promise<any> {
    // Implement data enrichment logic
    return { ...data, enriched: true }; // Placeholder
  }

  private async updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        startedAt: status === TaskStatus.RUNNING ? new Date() : undefined,
      },
    });
  }

  private async completeTask(taskId: string, result: any): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        result,
        completedAt: new Date(),
      },
    });
    
    // Check if parent task should be updated
    await this.checkParentTaskCompletion(taskId);
  }

  private async failTask(taskId: string, error: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    
    if (!task) return;
    
    const shouldRetry = task.retryCount < task.maxRetries;
    
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: shouldRetry ? TaskStatus.PENDING : TaskStatus.FAILED,
        error,
        retryCount: { increment: 1 },
        completedAt: shouldRetry ? null : new Date(),
      },
    });
    
    if (shouldRetry) {
      // Re-queue task with exponential backoff
      const delay = Math.pow(2, task.retryCount) * 1000;
      await queueUtils.addTask(
        {
          taskId,
          type: task.type,
          payload: task.payload,
        },
        { delay }
      );
    }
  }

  private async checkParentTaskCompletion(taskId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        parent: {
          include: {
            subtasks: true,
          },
        },
      },
    });
    
    if (!task?.parent) return;
    
    const allSubtasksComplete = task.parent.subtasks.every(
      st => st.status === TaskStatus.COMPLETED || st.status === TaskStatus.FAILED
    );
    
    if (allSubtasksComplete) {
      const hasFailures = task.parent.subtasks.some(
        st => st.status === TaskStatus.FAILED
      );
      
      await prisma.task.update({
        where: { id: task.parentId! },
        data: {
          status: hasFailures ? TaskStatus.FAILED : TaskStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    }
  }

  private calculateNextRun(schedule: any): Date {
    // Simple implementation - can be enhanced with cron expressions
    const now = new Date();
    
    switch (schedule.frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      default:
        return new Date(now.getTime() + 60 * 60 * 1000); // Default to hourly
    }
  }
}