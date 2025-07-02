import { BaseAgent } from './BaseAgent.js';
import { AgentCapability } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export class ExecutorAgent extends BaseAgent {
  constructor() {
    super('executor-001', 'Task Executor', 'System-level execution and command processing', 'llama3.2');
    
    // Add capabilities
    this.addCapability(new AgentCapability(
      'Code Generation',
      'Generate code in multiple programming languages',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'Task Planning',
      'Break down complex tasks into executable steps',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'File Operations',
      'Create, read, update, and manage files',
      '1.0.0'
    ));
    
    this.addCapability(new AgentCapability(
      'System Analysis',
      'Analyze system state and provide recommendations',
      '1.0.0'
    ));
    
    // Safe mode by default - can be disabled for unrestricted execution
    this.safeMode = true;
  }

  async processTask(task) {
    console.log(`ExecutorAgent processing task ${task.task_id}`);
    
    const { 
      command, 
      task_type = 'analysis',
      language = 'javascript',
      temperature = 0.3,
      max_tokens = 2000,
      safe_mode = true 
    } = task.parameters;
    
    this.safeMode = safe_mode;
    
    switch (task_type) {
      case 'code_generation':
        return await this.generateCode(command, language, { temperature, max_tokens });
        
      case 'task_planning':
        return await this.planTask(command, { temperature, max_tokens });
        
      case 'file_operation':
        return await this.handleFileOperation(task.parameters);
        
      case 'system_command':
        if (!this.safeMode) {
          return await this.executeSystemCommand(command);
        } else {
          throw new Error('System commands are disabled in safe mode');
        }
        
      case 'analysis':
      default:
        return await this.analyzeRequest(command, { temperature, max_tokens });
    }
  }

  async generateCode(prompt, language, options) {
    const systemPrompt = `You are an expert programmer. Generate clean, efficient, and well-commented code.
Language: ${language}
Only return the code without any markdown formatting or explanations unless specifically asked.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      // Extract code from response if it contains markdown
      let code = response.message.content;
      const codeMatch = code.match(/```[\w]*\n([\s\S]*?)\n```/);
      if (codeMatch) {
        code = codeMatch[1];
      }
      
      return {
        code: code,
        language: language,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to generate code');
    }
  }

  async planTask(taskDescription, options) {
    const systemPrompt = `You are a task planning expert. Break down complex tasks into clear, actionable steps.
Provide a structured plan with dependencies and estimated time for each step.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create a detailed plan for: ${taskDescription}` }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      return {
        plan: response.message.content,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to create task plan');
    }
  }

  async handleFileOperation(params) {
    const { operation, file_path, content, encoding = 'utf8' } = params;
    
    try {
      switch (operation) {
        case 'read':
          const data = await fs.readFile(file_path, encoding);
          return {
            operation: 'read',
            file_path: file_path,
            content: data,
            size: data.length,
            timestamp: Date.now()
          };
          
        case 'write':
          await fs.writeFile(file_path, content, encoding);
          return {
            operation: 'write',
            file_path: file_path,
            size: content.length,
            timestamp: Date.now()
          };
          
        case 'append':
          await fs.appendFile(file_path, content, encoding);
          return {
            operation: 'append',
            file_path: file_path,
            size: content.length,
            timestamp: Date.now()
          };
          
        case 'delete':
          await fs.unlink(file_path);
          return {
            operation: 'delete',
            file_path: file_path,
            timestamp: Date.now()
          };
          
        case 'exists':
          try {
            await fs.access(file_path);
            return {
              operation: 'exists',
              file_path: file_path,
              exists: true,
              timestamp: Date.now()
            };
          } catch {
            return {
              operation: 'exists',
              file_path: file_path,
              exists: false,
              timestamp: Date.now()
            };
          }
          
        case 'mkdir':
          await fs.mkdir(file_path, { recursive: true });
          return {
            operation: 'mkdir',
            file_path: file_path,
            timestamp: Date.now()
          };
          
        default:
          throw new Error(`Unknown file operation: ${operation}`);
      }
    } catch (error) {
      throw new Error(`File operation failed: ${error.message}`);
    }
  }

  async executeSystemCommand(command) {
    if (this.safeMode) {
      throw new Error('System commands are disabled in safe mode');
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        command: command,
        stdout: stdout,
        stderr: stderr,
        success: true,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        command: command,
        error: error.message,
        stdout: error.stdout || '',
        stderr: error.stderr || '',
        success: false,
        timestamp: Date.now()
      };
    }
  }

  async analyzeRequest(request, options) {
    const systemPrompt = `You are a helpful AI assistant that analyzes requests and provides detailed, actionable responses.
Focus on understanding the user's intent and providing comprehensive solutions.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request }
    ];

    const response = await this.chat(messages, options);
    
    if (response.success) {
      return {
        analysis: response.message.content,
        model: this.model,
        timestamp: Date.now()
      };
    } else {
      throw new Error(response.error || 'Failed to analyze request');
    }
  }
}