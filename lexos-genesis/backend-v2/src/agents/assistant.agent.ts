import { BaseAgent } from './base.agent';
import { ModelService } from '@/services/model.service';
import { prisma } from '@/utils/database';

export class AssistantAgent extends BaseAgent {
  private modelService: ModelService;

  protected async onInitialize(): Promise<void> {
    // Initialize model service
    this.modelService = new ModelService();

    // Add assistant capabilities
    this.addCapability('conversation');
    this.addCapability('task-execution');
    this.addCapability('knowledge-retrieval');
    this.addCapability('code-generation');

    // Register assistant tools
    this.registerAssistantTools();
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup any resources
  }

  async process(input: any): Promise<any> {
    const { type, conversationId, content, metadata } = input;

    switch (type) {
      case 'chat':
        return await this.handleChat(conversationId, content, metadata);
      
      case 'task':
        return await this.executeTask(content, metadata);
      
      case 'knowledge_query':
        return await this.queryKnowledge(content);
      
      case 'code_generation':
        return await this.generateCode(content, metadata);
      
      default:
        return await this.handleGenericRequest(input);
    }
  }

  private registerAssistantTools(): void {
    // Web search tool
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      schema: {
        query: { type: 'string', required: true },
        limit: { type: 'number', default: 5 },
      },
      handler: async (params) => {
        // Implement web search logic
        return {
          results: [
            {
              title: 'Example Result',
              url: 'https://example.com',
              snippet: 'This is an example search result',
            },
          ],
        };
      },
    });

    // Database query tool
    this.registerTool({
      name: 'database_query',
      description: 'Query the knowledge database',
      schema: {
        collection: { type: 'string', required: true },
        query: { type: 'object', required: true },
        limit: { type: 'number', default: 10 },
      },
      handler: async (params) => {
        // Implement database query logic
        return { results: [] };
      },
    });

    // Code execution tool
    this.registerTool({
      name: 'code_execute',
      description: 'Execute code in a sandboxed environment',
      schema: {
        language: { type: 'string', required: true },
        code: { type: 'string', required: true },
      },
      handler: async (params) => {
        // Implement sandboxed code execution
        return {
          output: 'Code execution not implemented',
          error: null,
        };
      },
    });

    // File operations tool
    this.registerTool({
      name: 'file_operations',
      description: 'Read, write, or manipulate files',
      schema: {
        operation: { type: 'string', enum: ['read', 'write', 'append', 'delete'] },
        path: { type: 'string', required: true },
        content: { type: 'string' },
      },
      handler: async (params) => {
        // Implement file operations with proper security
        return { success: true };
      },
    });
  }

  private async handleChat(conversationId: string, content: string, metadata?: any): Promise<any> {
    try {
      // Get conversation context
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Build context
      const context = messages.reverse().map(msg => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));

      // Add current message
      context.push({ role: 'user', content });

      // Get response from model
      const response = await this.modelService.generateChatCompletion({
        messages: context,
        model: this.config.model || 'default',
        temperature: this.config.temperature || 0.7,
        maxTokens: this.config.maxTokens || 1000,
      });

      // Save assistant message
      await this.sendMessage(conversationId, response.content, {
        model: response.model,
        tokens: response.usage,
      });

      return {
        content: response.content,
        metadata: {
          model: response.model,
          tokens: response.usage,
        },
      };
    } catch (error) {
      this.logger.error('Error handling chat:', error);
      throw error;
    }
  }

  private async executeTask(taskDescription: string, metadata?: any): Promise<any> {
    try {
      // Analyze task and determine required tools
      const analysis = await this.analyzeTask(taskDescription);
      
      // Execute task steps
      const results = [];
      for (const step of analysis.steps) {
        if (step.tool) {
          const result = await this.executeTool(step.tool, step.params);
          results.push({ step: step.description, result });
        }
      }

      return {
        task: taskDescription,
        analysis,
        results,
        summary: await this.summarizeResults(results),
      };
    } catch (error) {
      this.logger.error('Error executing task:', error);
      throw error;
    }
  }

  private async queryKnowledge(query: string): Promise<any> {
    try {
      // Search in agent memories
      const memories = await prisma.agentMemory.findMany({
        where: {
          agentId: this.id,
          OR: [
            { key: { contains: query, mode: 'insensitive' } },
            { value: { path: ['$'], string_contains: query } },
          ],
        },
        take: 10,
      });

      // Search in conversations
      const messages = await prisma.message.findMany({
        where: {
          content: { contains: query, mode: 'insensitive' },
        },
        take: 10,
        include: {
          conversation: true,
        },
      });

      return {
        memories: memories.map(m => ({
          key: m.key,
          value: m.value,
          relevance: this.calculateRelevance(query, JSON.stringify(m.value)),
        })),
        messages: messages.map(m => ({
          content: m.content,
          conversation: m.conversation.title,
          relevance: this.calculateRelevance(query, m.content),
        })),
      };
    } catch (error) {
      this.logger.error('Error querying knowledge:', error);
      throw error;
    }
  }

  private async generateCode(prompt: string, metadata?: any): Promise<any> {
    try {
      const { language = 'javascript', framework, requirements } = metadata || {};

      // Build code generation prompt
      const fullPrompt = this.buildCodePrompt(prompt, language, framework, requirements);

      // Generate code
      const response = await this.modelService.generateCompletion({
        prompt: fullPrompt,
        model: this.config.codeModel || 'default',
        temperature: 0.3,
        maxTokens: 2000,
      });

      // Extract and format code
      const code = this.extractCode(response.content);

      return {
        code,
        language,
        explanation: this.extractExplanation(response.content),
        suggestions: await this.generateCodeSuggestions(code, language),
      };
    } catch (error) {
      this.logger.error('Error generating code:', error);
      throw error;
    }
  }

  private async handleGenericRequest(input: any): Promise<any> {
    // Use model to understand and respond to generic requests
    const response = await this.modelService.generateCompletion({
      prompt: JSON.stringify(input),
      model: this.config.model || 'default',
    });

    return {
      response: response.content,
      confidence: response.confidence || 0.8,
    };
  }

  // Helper methods
  private async analyzeTask(description: string): Promise<any> {
    const prompt = `Analyze this task and break it down into steps: "${description}"
    
    Return a JSON object with:
    - steps: array of {description, tool?, params?}
    - complexity: low/medium/high
    - estimatedTime: in minutes`;

    const response = await this.modelService.generateCompletion({
      prompt,
      model: this.config.model || 'default',
      temperature: 0.3,
    });

    try {
      return JSON.parse(response.content);
    } catch {
      return {
        steps: [{ description: 'Execute task', tool: null, params: {} }],
        complexity: 'medium',
        estimatedTime: 5,
      };
    }
  }

  private async summarizeResults(results: any[]): Promise<string> {
    const prompt = `Summarize these task execution results in a clear, concise manner:
    ${JSON.stringify(results, null, 2)}`;

    const response = await this.modelService.generateCompletion({
      prompt,
      model: this.config.model || 'default',
      temperature: 0.5,
      maxTokens: 500,
    });

    return response.content;
  }

  private calculateRelevance(query: string, content: string): number {
    // Simple relevance calculation - can be improved with better algorithms
    const queryWords = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let matches = 0;
    queryWords.forEach(word => {
      if (contentLower.includes(word)) matches++;
    });

    return matches / queryWords.length;
  }

  private buildCodePrompt(prompt: string, language: string, framework?: string, requirements?: string[]): string {
    let fullPrompt = `Generate ${language} code for: ${prompt}\n\n`;
    
    if (framework) {
      fullPrompt += `Framework: ${framework}\n`;
    }
    
    if (requirements && requirements.length > 0) {
      fullPrompt += `Requirements:\n${requirements.map(r => `- ${r}`).join('\n')}\n`;
    }
    
    fullPrompt += '\nProvide clean, well-commented code with error handling.';
    
    return fullPrompt;
  }

  private extractCode(content: string): string {
    // Extract code blocks from markdown or plain text
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)```/g;
    const matches = content.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      return matches[0].replace(/```[\w]*\n/, '').replace(/```$/, '');
    }
    
    return content;
  }

  private extractExplanation(content: string): string {
    // Extract explanation text (non-code portions)
    const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
    return withoutCode;
  }

  private async generateCodeSuggestions(code: string, language: string): Promise<string[]> {
    // Generate improvement suggestions for the code
    return [
      'Consider adding input validation',
      'Add comprehensive error handling',
      'Include unit tests',
      'Document edge cases',
    ];
  }
}