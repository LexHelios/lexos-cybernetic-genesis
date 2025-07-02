import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GeminiService {
  constructor() {
    this.client = null;
    this.model = null;
    this.budgetLimit = parseFloat(process.env.GEMINI_BUDGET_LIMIT || '100');
    this.usageFile = path.join(__dirname, '../../data/gemini-usage.json');
    this.usage = {
      totalCost: 0,
      requests: 0,
      tokens: {
        input: 0,
        output: 0
      },
      resetDate: new Date().toISOString()
    };
    this.initialize();
  }

  async initialize() {
    if (process.env.GEMINI_API_KEY) {
      this.client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Use Gemini 2.5 Pro for coding tasks (when confidence is < 90%)
      this.model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash-thinking-exp' });
      await this.loadUsage();
      console.log('Gemini service initialized for coding tasks');
      console.log(`Budget limit: $${this.budgetLimit}, Current usage: $${this.usage.totalCost.toFixed(2)}`);
    } else {
      console.log('Gemini API key not configured');
    }
  }

  async loadUsage() {
    try {
      const data = await fs.readFile(this.usageFile, 'utf-8');
      this.usage = JSON.parse(data);
      
      // Reset monthly if needed
      const resetDate = new Date(this.usage.resetDate);
      const now = new Date();
      if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
        this.usage = {
          totalCost: 0,
          requests: 0,
          tokens: { input: 0, output: 0 },
          resetDate: now.toISOString()
        };
        await this.saveUsage();
      }
    } catch (error) {
      // File doesn't exist, create it
      await this.saveUsage();
    }
  }

  async saveUsage() {
    await fs.mkdir(path.dirname(this.usageFile), { recursive: true });
    await fs.writeFile(this.usageFile, JSON.stringify(this.usage, null, 2));
  }

  calculateCost(inputTokens, outputTokens) {
    // Gemini 1.5 Pro pricing (as of 2024)
    // Input: $0.0025 per 1K tokens (up to 128K context)
    // Output: $0.0075 per 1K tokens
    const inputCost = (inputTokens / 1000) * 0.0025;
    const outputCost = (outputTokens / 1000) * 0.0075;
    return inputCost + outputCost;
  }

  async checkBudget(estimatedTokens = 2000) {
    if (this.usage.totalCost >= this.budgetLimit) {
      throw new Error(`Monthly Gemini budget limit of $${this.budgetLimit} exceeded. Current usage: $${this.usage.totalCost.toFixed(2)}`);
    }
    
    // Estimate cost for this request
    const estimatedCost = this.calculateCost(estimatedTokens, estimatedTokens / 2);
    if (this.usage.totalCost + estimatedCost > this.budgetLimit) {
      throw new Error(`Request would exceed monthly budget. Remaining: $${(this.budgetLimit - this.usage.totalCost).toFixed(2)}`);
    }
  }

  async countTokens(text) {
    try {
      const { totalTokens } = await this.model.countTokens(text);
      return totalTokens;
    } catch (error) {
      // Fallback estimation
      return Math.ceil(text.length / 4);
    }
  }

  async chat(messages, options = {}) {
    if (!this.model) {
      throw new Error('Gemini client not initialized');
    }

    // Check budget before making request
    await this.checkBudget();

    try {
      // Convert messages to Gemini format
      const prompt = this.convertMessagesToPrompt(messages);
      
      // Count input tokens
      const inputTokens = await this.countTokens(prompt);
      
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.3,
          maxOutputTokens: options.maxTokens || 4096,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ],
      });

      const response = result.response;
      const text = response.text();
      const outputTokens = await this.countTokens(text);
      
      // Update usage
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.usage.totalCost += cost;
      this.usage.requests += 1;
      this.usage.tokens.input += inputTokens;
      this.usage.tokens.output += outputTokens;
      await this.saveUsage();

      console.log(`Gemini request cost: $${cost.toFixed(4)}, Total usage: $${this.usage.totalCost.toFixed(2)}/${this.budgetLimit}`);

      return {
        content: text,
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          cost: cost,
          budget_remaining: this.budgetLimit - this.usage.totalCost
        },
        model: 'gemini-2.0-flash-thinking-exp'
      };
    } catch (error) {
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  async streamChat(messages, onChunk, options = {}) {
    if (!this.model) {
      throw new Error('Gemini client not initialized');
    }

    // Check budget before making request
    await this.checkBudget();

    try {
      const prompt = this.convertMessagesToPrompt(messages);
      const inputTokens = await this.countTokens(prompt);
      
      const result = await this.model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature || 0.3,
          maxOutputTokens: options.maxTokens || 4096,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
        },
      });

      let outputText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        outputText += chunkText;
        if (chunkText) {
          onChunk(chunkText);
        }
      }

      // Update usage after streaming completes
      const outputTokens = await this.countTokens(outputText);
      const cost = this.calculateCost(inputTokens, outputTokens);
      this.usage.totalCost += cost;
      this.usage.requests += 1;
      this.usage.tokens.input += inputTokens;
      this.usage.tokens.output += outputTokens;
      await this.saveUsage();

      return { success: true, cost, budget_remaining: this.budgetLimit - this.usage.totalCost };
    } catch (error) {
      console.error('Gemini streaming error:', error);
      throw error;
    }
  }

  convertMessagesToPrompt(messages) {
    let prompt = '';
    
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += `Instructions: ${msg.content}\n\n`;
      } else if (msg.role === 'user') {
        prompt += `User: ${msg.content}\n\n`;
      } else if (msg.role === 'assistant') {
        prompt += `Assistant: ${msg.content}\n\n`;
      }
    }
    
    prompt += 'Assistant: ';
    return prompt.trim();
  }

  // Specialized coding methods
  async codingTask(task, code = '', options = {}) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert programmer specializing in all programming languages and frameworks. 
        Provide clean, efficient, well-documented code following best practices.
        Include detailed comments explaining complex logic.
        Consider performance, security, and maintainability.`
      },
      {
        role: 'user',
        content: task + (code ? '\n\nCurrent code:\n```\n' + code + '\n```' : '')
      }
    ];

    return await this.chat(messages, {
      ...options,
      temperature: 0.2 // Lower temperature for more consistent code
    });
  }

  async reviewCode(code, language = 'javascript', options = {}) {
    const messages = [
      {
        role: 'system',
        content: `You are a senior code reviewer with expertise in ${language}. 
        Provide a thorough code review covering:
        1. Potential bugs and edge cases
        2. Performance optimization opportunities
        3. Security vulnerabilities
        4. Code style and readability
        5. Best practices and design patterns
        6. Suggestions for improvement
        Format your response with clear sections and actionable feedback.`
      },
      {
        role: 'user',
        content: '```' + language + '\n' + code + '\n```'
      }
    ];

    return await this.chat(messages, options);
  }

  async generateTests(code, framework = 'jest', options = {}) {
    const messages = [
      {
        role: 'system',
        content: `Generate comprehensive unit tests using ${framework}. Include:
        - Happy path tests
        - Edge cases and boundary conditions
        - Error scenarios
        - Mock external dependencies
        - Performance tests where applicable
        - Test coverage should aim for 90%+`
      },
      {
        role: 'user',
        content: 'Generate tests for:\n```\n' + code + '\n```'
      }
    ];

    return await this.chat(messages, options);
  }

  async debugCode(code, error, options = {}) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert debugger. Analyze the code and error to:
        1. Identify the root cause
        2. Explain why the error occurs
        3. Provide a fixed version of the code
        4. Suggest preventive measures
        5. Include debugging tips for similar issues`
      },
      {
        role: 'user',
        content: `Debug this code that produces the following error:\nError: ${error}\n\nCode:\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    return await this.chat(messages, options);
  }

  async optimizeCode(code, targetMetric = 'performance', options = {}) {
    const metrics = {
      performance: 'execution speed and memory usage',
      readability: 'code clarity and maintainability',
      size: 'code size and bundle size',
      security: 'security vulnerabilities and best practices'
    };

    const messages = [
      {
        role: 'system',
        content: `Optimize the code for ${metrics[targetMetric] || targetMetric}. 
        Provide:
        1. Optimized version of the code
        2. Explanation of optimizations made
        3. Performance improvements expected
        4. Trade-offs if any
        5. Further optimization suggestions`
      },
      {
        role: 'user',
        content: '```\n' + code + '\n```'
      }
    ];

    return await this.chat(messages, options);
  }

  async explainCode(code, options = {}) {
    const messages = [
      {
        role: 'system',
        content: `Explain the code in detail for someone learning programming. Cover:
        1. Overall purpose and functionality
        2. Step-by-step breakdown
        3. Key concepts and patterns used
        4. Complexity analysis
        5. Potential improvements or alternatives
        Use clear, beginner-friendly language with examples.`
      },
      {
        role: 'user',
        content: '```\n' + code + '\n```'
      }
    ];

    return await this.chat(messages, options);
  }

  async convertCode(code, fromLang, toLang, options = {}) {
    const messages = [
      {
        role: 'system',
        content: `Convert code from ${fromLang} to ${toLang}. 
        Ensure:
        1. Functionality is preserved
        2. Follow ${toLang} idioms and best practices
        3. Handle language-specific features appropriately
        4. Include necessary imports/dependencies
        5. Add comments for non-obvious conversions`
      },
      {
        role: 'user',
        content: `Convert this ${fromLang} code:\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    return await this.chat(messages, options);
  }

  // Usage statistics
  async getUsageStats() {
    return {
      ...this.usage,
      budgetLimit: this.budgetLimit,
      percentUsed: (this.usage.totalCost / this.budgetLimit * 100).toFixed(2),
      daysInPeriod: Math.ceil((new Date() - new Date(this.usage.resetDate)) / (1000 * 60 * 60 * 24)),
      averageDailyCost: (this.usage.totalCost / Math.max(1, this.usage.requests)).toFixed(2)
    };
  }

  async resetUsage() {
    this.usage = {
      totalCost: 0,
      requests: 0,
      tokens: { input: 0, output: 0 },
      resetDate: new Date().toISOString()
    };
    await this.saveUsage();
    console.log('Gemini usage stats reset');
  }
}

// Create singleton instance
const geminiService = new GeminiService();

export default geminiService;