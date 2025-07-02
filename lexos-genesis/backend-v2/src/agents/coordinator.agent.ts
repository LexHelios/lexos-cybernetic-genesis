import { BaseAgent } from './base.agent';
import { AgentOrchestrator } from './orchestrator';
import { prisma } from '@/utils/database';
import { queueUtils } from '@/utils/queue';

interface TaskPlan {
  id: string;
  steps: TaskStep[];
  dependencies: Map<string, string[]>;
  status: 'planning' | 'executing' | 'completed' | 'failed';
}

interface TaskStep {
  id: string;
  description: string;
  agentId?: string;
  agentType?: string;
  capabilities: string[];
  input: any;
  output?: any;
  status: 'pending' | 'assigned' | 'executing' | 'completed' | 'failed';
  dependencies: string[];
}

export class CoordinatorAgent extends BaseAgent {
  private activePlans: Map<string, TaskPlan> = new Map();
  private orchestrator: AgentOrchestrator;

  protected async onInitialize(): Promise<void> {
    this.orchestrator = AgentOrchestrator.getInstance();

    // Add coordinator capabilities
    this.addCapability('coordination');
    this.addCapability('task-planning');
    this.addCapability('agent-assignment');
    this.addCapability('workflow-management');
    this.addCapability('conflict-resolution');

    // Register coordinator tools
    this.registerCoordinatorTools();
  }

  protected async onShutdown(): Promise<void> {
    // Cancel any active plans
    for (const [planId, plan] of this.activePlans) {
      if (plan.status === 'executing') {
        await this.cancelPlan(planId);
      }
    }
  }

  async process(input: any): Promise<any> {
    const { type, task, availableAgents } = input;

    switch (type) {
      case 'coordinate_task':
        return await this.coordinateTask(task, availableAgents);
      
      case 'create_workflow':
        return await this.createWorkflow(task);
      
      case 'monitor_execution':
        return await this.monitorExecution(task.planId);
      
      case 'resolve_conflict':
        return await this.resolveConflict(task);
      
      default:
        throw new Error(`Unknown coordination type: ${type}`);
    }
  }

  private registerCoordinatorTools(): void {
    // Task decomposition tool
    this.registerTool({
      name: 'decompose_task',
      description: 'Break down complex tasks into subtasks',
      schema: {
        task: { type: 'object', required: true },
      },
      handler: async (params) => {
        return await this.decomposeTask(params.task);
      },
    });

    // Agent selection tool
    this.registerTool({
      name: 'select_agent',
      description: 'Select the best agent for a task',
      schema: {
        requirements: { type: 'array', required: true },
        availableAgents: { type: 'array', required: true },
      },
      handler: async (params) => {
        return await this.selectBestAgent(params.requirements, params.availableAgents);
      },
    });

    // Progress monitoring tool
    this.registerTool({
      name: 'monitor_progress',
      description: 'Monitor task execution progress',
      schema: {
        planId: { type: 'string', required: true },
      },
      handler: async (params) => {
        return await this.getProgressReport(params.planId);
      },
    });
  }

  private async coordinateTask(task: any, availableAgents: any[]): Promise<any> {
    try {
      // Create execution plan
      const plan = await this.createExecutionPlan(task, availableAgents);
      this.activePlans.set(plan.id, plan);

      // Start execution
      await this.executePlan(plan);

      // Wait for completion or timeout
      const result = await this.waitForCompletion(plan.id, task.timeout || 300000);

      return {
        success: result.status === 'completed',
        planId: plan.id,
        results: result.results,
        summary: await this.generateExecutionSummary(plan),
      };
    } catch (error) {
      this.logger.error('Error coordinating task:', error);
      throw error;
    }
  }

  private async createExecutionPlan(task: any, availableAgents: any[]): Promise<TaskPlan> {
    const planId = `plan_${Date.now()}`;
    
    // Decompose task into steps
    const steps = await this.decomposeTask(task);
    
    // Build dependency graph
    const dependencies = this.buildDependencyGraph(steps);
    
    // Assign agents to steps
    for (const step of steps) {
      const agent = await this.selectBestAgent(step.capabilities, availableAgents);
      if (agent) {
        step.agentId = agent.id;
        step.status = 'assigned';
      }
    }

    return {
      id: planId,
      steps,
      dependencies,
      status: 'planning',
    };
  }

  private async decomposeTask(task: any): Promise<TaskStep[]> {
    // Analyze task complexity
    const complexity = this.analyzeComplexity(task);
    
    if (complexity === 'simple') {
      return [{
        id: `step_${Date.now()}`,
        description: task.description || 'Execute task',
        capabilities: task.requiredCapabilities || ['task-execution'],
        input: task,
        status: 'pending',
        dependencies: [],
      }];
    }

    // For complex tasks, break down into multiple steps
    const steps: TaskStep[] = [];
    
    // Example decomposition logic
    if (task.type === 'data_processing') {
      steps.push({
        id: `step_1`,
        description: 'Fetch data',
        capabilities: ['data-retrieval'],
        input: { source: task.dataSource },
        status: 'pending',
        dependencies: [],
      });
      
      steps.push({
        id: `step_2`,
        description: 'Process data',
        capabilities: ['data-processing'],
        input: { processingType: task.processingType },
        status: 'pending',
        dependencies: ['step_1'],
      });
      
      steps.push({
        id: `step_3`,
        description: 'Store results',
        capabilities: ['data-storage'],
        input: { destination: task.destination },
        status: 'pending',
        dependencies: ['step_2'],
      });
    }

    return steps;
  }

  private analyzeComplexity(task: any): 'simple' | 'complex' {
    // Analyze task to determine complexity
    const factors = [
      task.steps && task.steps.length > 1,
      task.requiredCapabilities && task.requiredCapabilities.length > 2,
      task.dependencies && task.dependencies.length > 0,
      task.parallel === true,
    ];

    const complexityScore = factors.filter(f => f).length;
    return complexityScore >= 2 ? 'complex' : 'simple';
  }

  private buildDependencyGraph(steps: TaskStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    steps.forEach(step => {
      graph.set(step.id, step.dependencies);
    });
    
    return graph;
  }

  private async selectBestAgent(requirements: string[], availableAgents: any[]): Promise<any> {
    // Score agents based on capability match
    const scores = availableAgents.map(agent => {
      const matchingCapabilities = requirements.filter(req =>
        agent.capabilities.includes(req)
      );
      
      return {
        agent,
        score: matchingCapabilities.length / requirements.length,
        matchingCapabilities,
      };
    });

    // Sort by score and return best match
    scores.sort((a, b) => b.score - a.score);
    
    if (scores.length > 0 && scores[0].score > 0) {
      return scores[0].agent;
    }
    
    return null;
  }

  private async executePlan(plan: TaskPlan): Promise<void> {
    plan.status = 'executing';
    
    // Execute steps respecting dependencies
    const executed = new Set<string>();
    
    while (executed.size < plan.steps.length) {
      // Find steps ready to execute
      const readySteps = plan.steps.filter(step =>
        step.status === 'assigned' &&
        step.dependencies.every(dep => executed.has(dep))
      );

      if (readySteps.length === 0) {
        // Check for deadlock
        const pendingSteps = plan.steps.filter(s => !executed.has(s.id));
        if (pendingSteps.length > 0) {
          throw new Error('Deadlock detected in execution plan');
        }
        break;
      }

      // Execute ready steps in parallel
      const executions = readySteps.map(step => this.executeStep(step, plan));
      await Promise.all(executions);

      // Mark as executed
      readySteps.forEach(step => {
        if (step.status === 'completed') {
          executed.add(step.id);
        }
      });
    }
  }

  private async executeStep(step: TaskStep, plan: TaskPlan): Promise<void> {
    try {
      step.status = 'executing';
      
      if (!step.agentId) {
        throw new Error(`No agent assigned to step ${step.id}`);
      }

      // Send task to agent
      const result = await this.orchestrator.sendMessageToAgent(step.agentId, {
        type: 'task',
        content: step.description,
        metadata: step.input,
      });

      step.output = result;
      step.status = 'completed';
      
      // Store intermediate result
      await this.storeStepResult(plan.id, step);
    } catch (error) {
      step.status = 'failed';
      step.output = { error: error.message };
      this.logger.error(`Failed to execute step ${step.id}:`, error);
      throw error;
    }
  }

  private async storeStepResult(planId: string, step: TaskStep): Promise<void> {
    // Store in Redis for quick access
    const key = `plan:${planId}:step:${step.id}`;
    await redis.setex(key, 3600, JSON.stringify({
      status: step.status,
      output: step.output,
      completedAt: new Date().toISOString(),
    }));
  }

  private async waitForCompletion(planId: string, timeout: number): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const plan = this.activePlans.get(planId);
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }

      const allCompleted = plan.steps.every(s => 
        s.status === 'completed' || s.status === 'failed'
      );

      if (allCompleted) {
        const hasFailures = plan.steps.some(s => s.status === 'failed');
        plan.status = hasFailures ? 'failed' : 'completed';
        
        return {
          status: plan.status,
          results: plan.steps.map(s => ({
            stepId: s.id,
            description: s.description,
            status: s.status,
            output: s.output,
          })),
        };
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Plan execution timeout after ${timeout}ms`);
  }

  private async generateExecutionSummary(plan: TaskPlan): Promise<string> {
    const completed = plan.steps.filter(s => s.status === 'completed').length;
    const failed = plan.steps.filter(s => s.status === 'failed').length;
    const total = plan.steps.length;

    let summary = `Execution Plan ${plan.id}:\n`;
    summary += `Total Steps: ${total}\n`;
    summary += `Completed: ${completed}\n`;
    summary += `Failed: ${failed}\n\n`;

    if (failed > 0) {
      summary += 'Failed Steps:\n';
      plan.steps
        .filter(s => s.status === 'failed')
        .forEach(s => {
          summary += `- ${s.description}: ${s.output?.error || 'Unknown error'}\n`;
        });
    }

    return summary;
  }

  private async createWorkflow(task: any): Promise<any> {
    // Create a reusable workflow template
    const workflow = {
      id: `workflow_${Date.now()}`,
      name: task.name,
      description: task.description,
      steps: await this.decomposeTask(task),
      triggers: task.triggers || [],
      schedule: task.schedule,
    };

    // Store workflow in database
    await prisma.task.create({
      data: {
        name: workflow.name,
        description: workflow.description,
        type: 'workflow',
        payload: workflow,
        status: 'PENDING',
      },
    });

    return workflow;
  }

  private async monitorExecution(planId: string): Promise<any> {
    const plan = this.activePlans.get(planId);
    if (!plan) {
      return { error: 'Plan not found' };
    }

    return {
      planId,
      status: plan.status,
      progress: this.calculateProgress(plan),
      steps: plan.steps.map(s => ({
        id: s.id,
        description: s.description,
        status: s.status,
        agentId: s.agentId,
      })),
    };
  }

  private calculateProgress(plan: TaskPlan): number {
    const completed = plan.steps.filter(s => 
      s.status === 'completed' || s.status === 'failed'
    ).length;
    return (completed / plan.steps.length) * 100;
  }

  private async resolveConflict(conflict: any): Promise<any> {
    // Implement conflict resolution strategies
    const { type, agents, resource } = conflict;

    switch (type) {
      case 'resource_contention':
        // Prioritize based on task priority
        return await this.resolveResourceContention(agents, resource);
      
      case 'capability_overlap':
        // Select most suitable agent
        return await this.resolveCapabilityOverlap(agents);
      
      default:
        return { resolution: 'manual_intervention_required' };
    }
  }

  private async resolveResourceContention(agents: any[], resource: any): Promise<any> {
    // Simple priority-based resolution
    const sortedAgents = agents.sort((a, b) => b.priority - a.priority);
    
    return {
      resolution: 'priority_based',
      winner: sortedAgents[0],
      queue: sortedAgents.slice(1),
    };
  }

  private async resolveCapabilityOverlap(agents: any[]): Promise<any> {
    // Select agent with best performance metrics
    const metrics = await Promise.all(
      agents.map(async agent => {
        const health = await this.orchestrator.getAgentById(agent.id)?.getHealth();
        return { agent, health };
      })
    );

    const best = metrics.reduce((prev, curr) => 
      curr.health?.uptime > prev.health?.uptime ? curr : prev
    );

    return {
      resolution: 'performance_based',
      selected: best.agent,
    };
  }

  private async cancelPlan(planId: string): Promise<void> {
    const plan = this.activePlans.get(planId);
    if (!plan) return;

    // Cancel executing steps
    for (const step of plan.steps) {
      if (step.status === 'executing' && step.agentId) {
        // Send cancellation signal to agent
        await this.orchestrator.sendMessageToAgent(step.agentId, {
          type: 'cancel_task',
          taskId: step.id,
        });
      }
    }

    plan.status = 'failed';
    this.activePlans.delete(planId);
  }

  private async getProgressReport(planId: string): Promise<any> {
    return await this.monitorExecution(planId);
  }
}