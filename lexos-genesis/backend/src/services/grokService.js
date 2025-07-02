import OpenAI from 'openai';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GrokService {
  constructor() {
    this.client = null;
    this.model = 'grok-vision-beta'; // Best for vision+text tasks
    this.budgetLimit = parseFloat(process.env.GROK_BUDGET_LIMIT || '100');
    this.usageFile = path.join(__dirname, '../../data/grok-usage.json');
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
    if (process.env.GROK_API_KEY) {
      // Grok uses OpenAI-compatible API
      this.client = new OpenAI({
        apiKey: process.env.GROK_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });
      await this.loadUsage();
      console.log('Grok service initialized for vision+text tasks');
      console.log(`Budget limit: $${this.budgetLimit}, Current usage: $${this.usage.totalCost.toFixed(2)}`);
    } else {
      console.log('Grok API key not configured');
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
    // Grok pricing (estimated - adjust based on actual pricing)
    // Input: $0.002 per 1K tokens
    // Output: $0.006 per 1K tokens
    const inputCost = (inputTokens / 1000) * 0.002;
    const outputCost = (outputTokens / 1000) * 0.006;
    return inputCost + outputCost;
  }

  async checkBudget(estimatedTokens = 2000) {
    if (this.usage.totalCost >= this.budgetLimit) {
      throw new Error(`Monthly Grok budget limit of $${this.budgetLimit} exceeded. Current usage: $${this.usage.totalCost.toFixed(2)}`);
    }
    
    // Estimate cost for this request
    const estimatedCost = this.calculateCost(estimatedTokens, estimatedTokens / 2);
    if (this.usage.totalCost + estimatedCost > this.budgetLimit) {
      throw new Error(`Request would exceed monthly budget. Remaining: $${(this.budgetLimit - this.usage.totalCost).toFixed(2)}`);
    }
  }

  async chat(messages, options = {}) {
    if (!this.client) {
      throw new Error('Grok client not initialized');
    }

    // Check budget before making request
    await this.checkBudget();

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        top_p: options.topP || 0.9,
        ...options
      });

      const usage = response.usage;
      const cost = this.calculateCost(usage.prompt_tokens, usage.completion_tokens);
      
      // Update usage
      this.usage.totalCost += cost;
      this.usage.requests += 1;
      this.usage.tokens.input += usage.prompt_tokens;
      this.usage.tokens.output += usage.completion_tokens;
      await this.saveUsage();

      console.log(`Grok request cost: $${cost.toFixed(4)}, Total usage: $${this.usage.totalCost.toFixed(2)}/${this.budgetLimit}`);

      return {
        content: response.choices[0].message.content,
        usage: {
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          cost: cost,
          budget_remaining: this.budgetLimit - this.usage.totalCost
        },
        model: this.model
      };
    } catch (error) {
      console.error('Grok API error:', error);
      throw error;
    }
  }

  async streamChat(messages, onChunk, options = {}) {
    if (!this.client) {
      throw new Error('Grok client not initialized');
    }

    // Check budget before making request
    await this.checkBudget();

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 4096,
        stream: true,
        ...options
      });

      let totalTokens = 0;
      let outputText = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          outputText += content;
          onChunk(content);
        }
      }

      // Estimate tokens (Grok doesn't provide token count in streaming)
      const estimatedInputTokens = Math.ceil(JSON.stringify(messages).length / 4);
      const estimatedOutputTokens = Math.ceil(outputText.length / 4);
      const cost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);
      
      // Update usage
      this.usage.totalCost += cost;
      this.usage.requests += 1;
      this.usage.tokens.input += estimatedInputTokens;
      this.usage.tokens.output += estimatedOutputTokens;
      await this.saveUsage();

      return { success: true, cost, budget_remaining: this.budgetLimit - this.usage.totalCost };
    } catch (error) {
      console.error('Grok streaming error:', error);
      throw error;
    }
  }

  // Vision-specific method for analyzing images with text
  async analyzeImageWithText(imageUrl, prompt, options = {}) {
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
              detail: options.detail || 'high'
            }
          }
        ]
      }
    ];

    return await this.chat(messages, {
      ...options,
      temperature: 0.3 // Lower temperature for analysis tasks
    });
  }

  // Analyze multiple images
  async analyzeMultipleImages(images, prompt, options = {}) {
    const content = [
      {
        type: 'text',
        text: prompt
      }
    ];

    // Add all images to the content
    images.forEach((imageUrl, index) => {
      content.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: options.detail || 'high'
        }
      });
    });

    const messages = [
      {
        role: 'user',
        content: content
      }
    ];

    return await this.chat(messages, options);
  }

  // Code analysis with visual elements (diagrams, screenshots, etc.)
  async analyzeCodeWithVisuals(code, imageUrls = [], analysis_type = 'general', options = {}) {
    let prompt = '';
    
    switch (analysis_type) {
      case 'debug':
        prompt = `Analyze this code and any visual elements (screenshots, error messages, diagrams) to help debug the issue. Provide:
1. Analysis of the code logic
2. Interpretation of any visual clues
3. Identification of potential bugs
4. Suggested fixes
5. Prevention strategies`;
        break;
      case 'review':
        prompt = `Review this code and any associated visual documentation. Provide feedback on:
1. Code quality and structure
2. How well it matches any visual specifications
3. UI/UX considerations if applicable
4. Performance implications
5. Best practices`;
        break;
      case 'explanation':
        prompt = `Explain this code and any visual elements in detail. Cover:
1. What the code does
2. How visual elements relate to the code
3. Key concepts and patterns
4. Flow and architecture
5. Learning points`;
        break;
      default:
        prompt = `Analyze this code and any visual materials provided. Give a comprehensive analysis covering functionality, structure, and how the visual elements relate to the code.`;
    }

    const content = [
      {
        type: 'text',
        text: `${prompt}\n\nCode:\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    // Add visual elements
    imageUrls.forEach(url => {
      content.push({
        type: 'image_url',
        image_url: {
          url: url,
          detail: 'high'
        }
      });
    });

    const messages = [
      {
        role: 'user',
        content: content
      }
    ];

    return await this.chat(messages, options);
  }

  // UI/UX analysis from screenshots
  async analyzeUI(imageUrls, prompt = '', options = {}) {
    const defaultPrompt = `Analyze this UI/interface. Provide feedback on:
1. Design principles and usability
2. Visual hierarchy and layout
3. Accessibility considerations
4. User experience flow
5. Suggestions for improvement
6. Technical implementation considerations`;

    const finalPrompt = prompt || defaultPrompt;

    if (Array.isArray(imageUrls)) {
      return await this.analyzeMultipleImages(imageUrls, finalPrompt, options);
    } else {
      return await this.analyzeImageWithText(imageUrls, finalPrompt, options);
    }
  }

  // Document analysis (PDFs, images of documents, etc.)
  async analyzeDocument(imageUrl, analysisType = 'general', options = {}) {
    const prompts = {
      'extract': 'Extract all text content from this document and structure it clearly.',
      'summarize': 'Provide a comprehensive summary of this document, highlighting key points and main ideas.',
      'analyze': 'Analyze this document for important information, insights, and actionable items.',
      'code': 'Extract and analyze any code snippets, technical specifications, or implementation details from this document.',
      'general': 'Analyze this document and provide insights on its content, structure, and key information.'
    };

    const prompt = prompts[analysisType] || prompts.general;
    return await this.analyzeImageWithText(imageUrl, prompt, options);
  }

  // Creative coding tasks with visual inspiration
  async creativeCodeFromVisual(imageUrl, codeRequest, options = {}) {
    const prompt = `Based on this visual inspiration, ${codeRequest}. 

Consider:
1. Visual elements and aesthetics shown
2. Color schemes and styling
3. Layout and composition
4. Interactive elements visible
5. Overall design philosophy

Provide clean, well-commented code that captures the essence of the visual.`;

    return await this.analyzeImageWithText(imageUrl, prompt, {
      ...options,
      temperature: 0.8 // Higher temperature for creativity
    });
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
    console.log('Grok usage stats reset');
  }
}

// Create singleton instance
const grokService = new GrokService();

export default grokService;