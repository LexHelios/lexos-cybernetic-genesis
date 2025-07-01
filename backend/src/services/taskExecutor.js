import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

class TaskExecutor {
  constructor() {
    this.executors = new Map();
    this.registerDefaultExecutors();
  }

  registerExecutor(type, handler) {
    this.executors.set(type, handler);
  }

  async execute(task) {
    const executor = this.executors.get(task.data.type);
    if (!executor) {
      throw new Error(`No executor found for task type: ${task.data.type}`);
    }

    try {
      const result = await executor(task.data.config, task);
      return result;
    } catch (error) {
      console.error(`Task execution failed: ${error.message}`);
      throw error;
    }
  }

  registerDefaultExecutors() {
    // Shell command executor
    this.registerExecutor('shell', async (config) => {
      const { command, cwd, env } = config;
      const { stdout, stderr } = await execAsync(command, {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env }
      });
      
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: 0
      };
    });

    // HTTP request executor
    this.registerExecutor('http-request', async (config) => {
      const { url, method = 'GET', headers = {}, data, timeout = 30000 } = config;
      
      const response = await axios({
        url,
        method,
        headers,
        data,
        timeout
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
    });

    // File operations
    this.registerExecutor('file-read', async (config) => {
      const { filePath, encoding = 'utf8' } = config;
      const content = await fs.readFile(filePath, encoding);
      return { content, size: Buffer.byteLength(content) };
    });

    this.registerExecutor('file-write', async (config) => {
      const { filePath, content, encoding = 'utf8' } = config;
      await fs.writeFile(filePath, content, encoding);
      return { success: true, path: filePath };
    });

    this.registerExecutor('file-copy', async (config) => {
      const { source, destination } = config;
      await fs.copyFile(source, destination);
      return { success: true, source, destination };
    });

    // Data processing
    this.registerExecutor('data-transform', async (config) => {
      const { data, transformations } = config;
      let result = data;

      for (const transform of transformations) {
        switch (transform.type) {
          case 'filter':
            result = result.filter(item => this.evaluateExpression(item, transform.condition));
            break;
          case 'map':
            result = result.map(item => this.applyMapping(item, transform.mapping));
            break;
          case 'sort':
            result = result.sort((a, b) => {
              const aVal = this.getNestedValue(a, transform.field);
              const bVal = this.getNestedValue(b, transform.field);
              return transform.order === 'desc' ? bVal - aVal : aVal - bVal;
            });
            break;
          case 'aggregate':
            result = this.aggregate(result, transform);
            break;
        }
      }

      return { data: result, count: Array.isArray(result) ? result.length : 1 };
    });

    // Data validation
    this.registerExecutor('data-validate', async (config) => {
      const { data, schema } = config;
      const errors = [];
      
      // Simple schema validation
      for (const [field, rules] of Object.entries(schema)) {
        const value = this.getNestedValue(data, field);
        
        if (rules.required && (value === undefined || value === null)) {
          errors.push({ field, error: 'Required field missing' });
        }
        
        if (rules.type && value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== rules.type) {
            errors.push({ field, error: `Expected type ${rules.type}, got ${actualType}` });
          }
        }
        
        if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
          errors.push({ field, error: `Value ${value} is less than minimum ${rules.min}` });
        }
        
        if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
          errors.push({ field, error: `Value ${value} is greater than maximum ${rules.max}` });
        }
        
        if (rules.pattern && typeof value === 'string') {
          const regex = new RegExp(rules.pattern);
          if (!regex.test(value)) {
            errors.push({ field, error: `Value does not match pattern ${rules.pattern}` });
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        data
      };
    });

    // Computation tasks
    this.registerExecutor('compute', async (config) => {
      const { operation, values } = config;
      let result;

      switch (operation) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'average':
          result = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
        case 'hash':
          const hash = createHash('sha256');
          hash.update(JSON.stringify(values));
          result = hash.digest('hex');
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      return { result, operation, inputCount: values.length };
    });

    // Delay/wait task
    this.registerExecutor('delay', async (config) => {
      const { duration = 1000 } = config;
      await new Promise(resolve => setTimeout(resolve, duration));
      return { delayed: duration };
    });

    // Conditional executor
    this.registerExecutor('conditional', async (config) => {
      const { condition, ifTrue, ifFalse, variables = {} } = config;
      const result = this.evaluateExpression(variables, condition);
      
      return {
        conditionMet: result,
        executed: result ? 'ifTrue' : 'ifFalse',
        result: result ? ifTrue : ifFalse
      };
    });

    // Parallel executor
    this.registerExecutor('parallel', async (config, parentTask) => {
      const { tasks, maxConcurrency = 5 } = config;
      const results = [];
      
      // Execute tasks in batches
      for (let i = 0; i < tasks.length; i += maxConcurrency) {
        const batch = tasks.slice(i, i + maxConcurrency);
        const batchResults = await Promise.all(
          batch.map(taskConfig => this.execute({
            data: taskConfig,
            id: `${parentTask.id}-parallel-${i}`
          }))
        );
        results.push(...batchResults);
      }

      return {
        results,
        totalTasks: tasks.length,
        successful: results.filter(r => r && !r.error).length
      };
    });

    // Loop executor
    this.registerExecutor('loop', async (config, parentTask) => {
      const { items, task, maxIterations = 1000 } = config;
      const results = [];
      
      const itemsToProcess = items.slice(0, maxIterations);
      
      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        const taskConfig = {
          ...task,
          config: {
            ...task.config,
            item,
            index: i
          }
        };
        
        const result = await this.execute({
          data: taskConfig,
          id: `${parentTask.id}-loop-${i}`
        });
        
        results.push(result);
      }

      return {
        results,
        processed: results.length,
        total: items.length
      };
    });

    // Email sender (mock)
    this.registerExecutor('send-email', async (config) => {
      const { to, subject, body, attachments = [] } = config;
      
      // In production, integrate with email service
      console.log(`Sending email to ${to}: ${subject}`);
      
      return {
        sent: true,
        to,
        subject,
        timestamp: new Date().toISOString(),
        messageId: `msg-${Date.now()}`
      };
    });

    // Database query (mock)
    this.registerExecutor('database-query', async (config) => {
      const { query, parameters = {} } = config;
      
      // In production, integrate with actual database
      console.log(`Executing query: ${query}`, parameters);
      
      // Mock response
      return {
        rows: [
          { id: 1, name: 'Sample Record', created: new Date().toISOString() }
        ],
        rowCount: 1,
        query
      };
    });

    // AI/ML task (mock)
    this.registerExecutor('ai-inference', async (config) => {
      const { model, input, parameters = {} } = config;
      
      // In production, integrate with ML service
      console.log(`Running inference with model ${model}`);
      
      // Mock response
      return {
        model,
        predictions: [
          { label: 'positive', confidence: 0.85 },
          { label: 'negative', confidence: 0.15 }
        ],
        processingTime: Math.random() * 1000
      };
    });
  }

  // Helper methods
  evaluateExpression(context, expression) {
    // Simple expression evaluator
    // In production, use a proper expression parser
    try {
      const func = new Function('context', `with(context) { return ${expression}; }`);
      return func(context);
    } catch (error) {
      console.error('Expression evaluation failed:', error);
      return false;
    }
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
  }

  applyMapping(item, mapping) {
    const result = {};
    for (const [targetField, sourceField] of Object.entries(mapping)) {
      result[targetField] = this.getNestedValue(item, sourceField);
    }
    return result;
  }

  aggregate(data, config) {
    const { groupBy, aggregations } = config;
    const groups = {};

    // Group data
    for (const item of data) {
      const key = groupBy ? this.getNestedValue(item, groupBy) : 'all';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }

    // Apply aggregations
    const result = [];
    for (const [key, items] of Object.entries(groups)) {
      const aggregated = { [groupBy || 'group']: key };
      
      for (const [field, operation] of Object.entries(aggregations)) {
        const values = items.map(item => this.getNestedValue(item, field)).filter(v => v !== undefined);
        
        switch (operation) {
          case 'sum':
            aggregated[`${field}_sum`] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            aggregated[`${field}_avg`] = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'count':
            aggregated[`${field}_count`] = values.length;
            break;
          case 'min':
            aggregated[`${field}_min`] = Math.min(...values);
            break;
          case 'max':
            aggregated[`${field}_max`] = Math.max(...values);
            break;
        }
      }
      
      result.push(aggregated);
    }

    return result;
  }
}

export default new TaskExecutor();