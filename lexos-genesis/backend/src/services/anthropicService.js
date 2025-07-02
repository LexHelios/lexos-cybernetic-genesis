import Anthropic from '@anthropic-ai/sdk';
import openAIService from './openaiService.js';
import { config } from 'dotenv';

config();

class AnthropicService {
  constructor() {
    this.client = null;
    this.model = 'claude-3-opus-20240229'; // Claude Opus for coding
    this.initialize();
  }

  initialize() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.client = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
      console.log('Anthropic service initialized with Claude Opus');
    } else {
      console.log('Anthropic API key not configured');
    }
  }

  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      // Convert OpenAI format to Anthropic format
      const anthropicMessages = this.convertMessages(messages);
      
      const response = await this.client.messages.create({
        model: this.model,
        messages: anthropicMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        ...options
      });

      return {
        content: response.content[0].text,
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        },
        model: response.model
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }

  async streamChat(messages, onChunk, options = {}) {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      const anthropicMessages = this.convertMessages(messages);
      
      const stream = await this.client.messages.create({
        model: this.model,
        messages: anthropicMessages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
        stream: true,
        ...options
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const content = chunk.delta.text || '';
          if (content) {
            onChunk(content);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Anthropic streaming error:', error);
      throw error;
    }
  }

  // Convert OpenAI message format to Anthropic format
  convertMessages(messages) {
    const anthropicMessages = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        anthropicMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Add system prompt to first user message if exists
    if (systemPrompt && anthropicMessages.length > 0 && anthropicMessages[0].role === 'user') {
      anthropicMessages[0].content = systemPrompt + '\n' + anthropicMessages[0].content;
    }

    return anthropicMessages;
  }

  // Coding-specific method with Claude Opus as fallback
  async codingTask(task, code = '', options = {}) {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert programmer. Provide clean, efficient, and well-commented code.'
      },
      {
        role: 'user',
        content: task + (code ? '\n\nCurrent code:\n```\n' + code + '\n```' : '')
      }
    ];

    try {
      // Try GPT-4 first
      console.log('Processing coding task with GPT-4...');
      return await openAIService.chat(messages, {
        ...options,
        temperature: 0.3 // Lower temperature for coding
      });
    } catch (error) {
      console.error('GPT-4 failed, escalating to Claude Opus:', error.message);
      
      // Fallback to Claude Opus
      return await this.chat(messages, {
        ...options,
        temperature: 0.3
      });
    }
  }

  // Code review with escalation
  async reviewCode(code, language = 'javascript', options = {}) {
    const messages = [
      {
        role: 'system',
        content: `You are a senior code reviewer. Review the following ${language} code for:
1. Bugs and potential issues
2. Performance optimizations
3. Security vulnerabilities
4. Code style and best practices
5. Suggestions for improvement`
      },
      {
        role: 'user',
        content: '```' + language + '\n' + code + '\n```'
      }
    ];

    try {
      return await openAIService.chat(messages, options);
    } catch (error) {
      console.error('Code review with GPT-4 failed, using Claude Opus:', error.message);
      return await this.chat(messages, options);
    }
  }

  // Generate tests with escalation
  async generateTests(code, framework = 'jest', options = {}) {
    const messages = [
      {
        role: 'system',
        content: `Generate comprehensive unit tests for the provided code using ${framework}. Include edge cases and error scenarios.`
      },
      {
        role: 'user',
        content: 'Generate tests for:\n```\n' + code + '\n```'
      }
    ];

    try {
      return await this.chat(messages, options);
    } catch (error) {
      console.error('Test generation with GPT-4 failed, using Claude Opus:', error.message);
      return await openAIService.chat(messages, options);
    }
  }

  // Refactor code with escalation
  async refactorCode(code, requirements = '', options = {}) {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert at code refactoring. Improve the code structure, readability, and performance while maintaining functionality.'
      },
      {
        role: 'user',
        content: `Refactor this code${requirements ? ' with these requirements: ' + requirements : ''}:\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    try {
      return await this.chat(messages, options);
    } catch (error) {
      console.error('Refactoring with GPT-4 failed, using Claude Opus:', error.message);
      return await openAIService.chat(messages, options);
    }
  }

  // Debug code with escalation
  async debugCode(code, error, options = {}) {
    const messages = [
      {
        role: 'system',
        content: 'You are an expert debugger. Identify the issue and provide a fixed version of the code.'
      },
      {
        role: 'user',
        content: `Debug this code that produces the following error:\nError: ${error}\n\nCode:\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    try {
      return await this.chat(messages, options);
    } catch (error) {
      console.error('Debugging with GPT-4 failed, using Claude Opus:', error.message);
      return await openAIService.chat(messages, options);
    }
  }

  // Explain code with escalation
  async explainCode(code, options = {}) {
    const messages = [
      {
        role: 'system',
        content: 'Explain the following code in detail, including what it does, how it works, and any important concepts.'
      },
      {
        role: 'user',
        content: '```\n' + code + '\n```'
      }
    ];

    try {
      return await this.chat(messages, options);
    } catch (error) {
      console.error('Code explanation with GPT-4 failed, using Claude Opus:', error.message);
      return await openAIService.chat(messages, options);
    }
  }

  // Optimize code with escalation
  async optimizeCode(code, targetMetric = 'performance', options = {}) {
    const messages = [
      {
        role: 'system',
        content: `Optimize the following code for ${targetMetric}. Provide the optimized version with explanations.`
      },
      {
        role: 'user',
        content: '```\n' + code + '\n```'
      }
    ];

    try {
      return await this.chat(messages, options);
    } catch (error) {
      console.error('Code optimization with GPT-4 failed, using Claude Opus:', error.message);
      return await openAIService.chat(messages, options);
    }
  }

  // Convert code between languages
  async convertCode(code, fromLang, toLang, options = {}) {
    const messages = [
      {
        role: 'system',
        content: `Convert code from ${fromLang} to ${toLang}. Maintain functionality and follow ${toLang} best practices.`
      },
      {
        role: 'user',
        content: `Convert this ${fromLang} code:\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    try {
      return await this.chat(messages, options);
    } catch (error) {
      console.error('Code conversion with GPT-4 failed, using Claude Opus:', error.message);
      return await openAIService.chat(messages, options);
    }
  }
}

// Create singleton instance
const anthropicService = new AnthropicService();

export default anthropicService;