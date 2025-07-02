import twilio from 'twilio';
import { config } from 'dotenv';
import multiModelCodingService from './multiModelCodingService.js';
import grokService from './grokService.js';
import openAIService from './openaiService.js';
import budgetManager from './budgetManager.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.apiKeySid = process.env.TWILIO_API_KEY_SID;
    this.client = null;
    this.conversationHistory = new Map(); // Store conversations by phone number
    this.userProfiles = new Map(); // Store user preferences and context
    this.initialize();
  }

  initialize() {
    if (this.accountSid && this.authToken) {
      this.client = twilio(this.accountSid, this.authToken);
      console.log('Twilio service initialized for LexOS texting');
      console.log(`Phone number: ${this.phoneNumber}`);
    } else {
      console.log('Twilio credentials not configured');
    }
  }

  // Send SMS message
  async sendSMS(to, message, options = {}) {
    if (!this.client) {
      throw new Error('Twilio client not initialized');
    }

    try {
      const messageOptions = {
        body: message,
        from: this.phoneNumber,
        to: to,
        ...options
      };

      // Add media URL if provided
      if (options.mediaUrl) {
        messageOptions.mediaUrl = options.mediaUrl;
      }

      const response = await this.client.messages.create(messageOptions);
      
      console.log(`SMS sent to ${to}: ${message.substring(0, 50)}...`);
      
      return {
        success: true,
        messageSid: response.sid,
        status: response.status,
        to: response.to,
        from: response.from
      };
    } catch (error) {
      console.error('Twilio SMS error:', error);
      throw error;
    }
  }

  // Send MMS with image
  async sendMMS(to, message, imageUrl, options = {}) {
    return await this.sendSMS(to, message, {
      ...options,
      mediaUrl: imageUrl
    });
  }

  // Handle incoming SMS messages
  async handleIncomingSMS(body, from, messageId, mediaUrls = []) {
    try {
      console.log(`Incoming SMS from ${from}: ${body}`);
      
      // Get or create user profile
      const userProfile = this.getUserProfile(from);
      
      // Get conversation history
      const history = this.getConversationHistory(from);
      
      // Determine message type and route accordingly
      const messageType = this.classifyMessage(body);
      
      let response;
      switch (messageType) {
        case 'coding':
          response = await this.handleCodingRequest(body, from, history, mediaUrls);
          break;
        case 'vision':
          response = await this.handleVisionRequest(body, from, history, mediaUrls);
          break;
        case 'general':
          response = await this.handleGeneralRequest(body, from, history);
          break;
        case 'command':
          response = await this.handleCommand(body, from, userProfile);
          break;
        default:
          response = await this.handleGeneralRequest(body, from, history);
      }

      // Store conversation
      this.addToConversationHistory(from, { role: 'user', content: body, timestamp: new Date() });
      this.addToConversationHistory(from, { role: 'assistant', content: response, timestamp: new Date() });

      // Send response via SMS
      await this.sendResponse(from, response);

      return { success: true, response };
    } catch (error) {
      console.error('Error handling incoming SMS:', error);
      const errorResponse = "Sorry, I encountered an error processing your message. Please try again.";
      await this.sendResponse(from, errorResponse);
      return { success: false, error: error.message };
    }
  }

  // Classify message type
  classifyMessage(message) {
    const messageLower = message.toLowerCase();
    
    // Command patterns
    if (messageLower.startsWith('/') || messageLower.startsWith('!')) {
      return 'command';
    }
    
    // Coding patterns
    const codingKeywords = ['code', 'function', 'debug', 'error', 'programming', 'javascript', 'python', 'react', 'css', 'html', 'api'];
    if (codingKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'coding';
    }
    
    // Vision patterns
    const visionKeywords = ['image', 'picture', 'photo', 'design', 'ui', 'screenshot', 'analyze', 'look at'];
    if (visionKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'vision';
    }
    
    return 'general';
  }

  // Handle coding requests
  async handleCodingRequest(message, from, history, mediaUrls = []) {
    try {
      // Check if there are code-related images
      if (mediaUrls.length > 0) {
        return await grokService.analyzeCodeWithVisuals(message, mediaUrls, 'general');
      }
      
      // Use multi-model coding service
      const result = await multiModelCodingService.solveCodingTask(message, '', { 
        maxTokens: 1000, // Limit for SMS
        temperature: 0.3 
      });
      
      return this.formatResponseForSMS(result.content);
    } catch (error) {
      return "I'm having trouble with coding requests right now. Please try a simpler question.";
    }
  }

  // Handle vision requests
  async handleVisionRequest(message, from, history, mediaUrls = []) {
    try {
      if (mediaUrls.length === 0) {
        return "I'd be happy to analyze images! Please send an image with your question.";
      }
      
      const result = await grokService.analyzeImageWithText(mediaUrls[0], message || "Analyze this image");
      return this.formatResponseForSMS(result.content);
    } catch (error) {
      return "I couldn't analyze the image. Please try sending it again.";
    }
  }

  // Handle general requests
  async handleGeneralRequest(message, from, history) {
    try {
      // Build context from conversation history
      const messages = [
        {
          role: 'system',
          content: 'You are LEX, an AI assistant responding via SMS. Keep responses under 1600 characters and conversational.'
        },
        ...history.slice(-5), // Last 5 messages for context
        {
          role: 'user',
          content: message
        }
      ];

      const result = await openAIService.chat(messages, { 
        maxTokens: 400,
        temperature: 0.7 
      });
      
      return this.formatResponseForSMS(result.content);
    } catch (error) {
      return "I'm having technical difficulties. Please try again later.";
    }
  }

  // Handle commands
  async handleCommand(message, from, userProfile) {
    const command = message.toLowerCase().replace(/^[\/!]/, '');
    
    switch (command) {
      case 'help':
        return this.getHelpMessage();
      case 'status':
        return await this.getStatusMessage();
      case 'budget':
        return await this.getBudgetStatus();
      case 'clear':
        this.clearConversationHistory(from);
        return "Conversation history cleared.";
      case 'profile':
        return this.getUserProfileInfo(from);
      case 'models':
        return this.getAvailableModels();
      default:
        return `Unknown command: ${command}. Type /help for available commands.`;
    }
  }

  // Format response for SMS (character limit)
  formatResponseForSMS(content, maxLength = 1600) {
    if (content.length <= maxLength) {
      return content;
    }
    
    // Truncate and add continuation indicator
    const truncated = content.substring(0, maxLength - 50);
    const lastSpace = truncated.lastIndexOf(' ');
    const finalContent = lastSpace > maxLength - 200 ? 
      truncated.substring(0, lastSpace) : 
      truncated;
    
    return finalContent + "... (continued - ask for more details)";
  }

  // Send response (split if too long)
  async sendResponse(to, response) {
    const maxSMSLength = 1600;
    
    if (response.length <= maxSMSLength) {
      await this.sendSMS(to, response);
      return;
    }
    
    // Split into multiple messages
    const parts = this.splitMessage(response, maxSMSLength);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const prefix = parts.length > 1 ? `(${i + 1}/${parts.length}) ` : '';
      await this.sendSMS(to, prefix + part);
      
      // Small delay between messages
      if (i < parts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // Split message into SMS-sized chunks
  splitMessage(message, maxLength) {
    const parts = [];
    let remaining = message;
    
    while (remaining.length > maxLength) {
      let splitPoint = maxLength;
      const lastSpace = remaining.lastIndexOf(' ', maxLength);
      const lastNewline = remaining.lastIndexOf('\n', maxLength);
      
      splitPoint = Math.max(lastSpace, lastNewline);
      if (splitPoint === -1 || splitPoint < maxLength * 0.8) {
        splitPoint = maxLength;
      }
      
      parts.push(remaining.substring(0, splitPoint).trim());
      remaining = remaining.substring(splitPoint).trim();
    }
    
    if (remaining.length > 0) {
      parts.push(remaining);
    }
    
    return parts;
  }

  // Conversation history management
  getConversationHistory(phoneNumber) {
    if (!this.conversationHistory.has(phoneNumber)) {
      this.conversationHistory.set(phoneNumber, []);
    }
    return this.conversationHistory.get(phoneNumber);
  }

  addToConversationHistory(phoneNumber, message) {
    const history = this.getConversationHistory(phoneNumber);
    history.push(message);
    
    // Keep only last 20 messages
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  clearConversationHistory(phoneNumber) {
    this.conversationHistory.set(phoneNumber, []);
  }

  // User profile management
  getUserProfile(phoneNumber) {
    if (!this.userProfiles.has(phoneNumber)) {
      this.userProfiles.set(phoneNumber, {
        phoneNumber,
        firstContact: new Date(),
        lastContact: new Date(),
        messageCount: 0,
        preferences: {},
        subscription: 'basic'
      });
    }
    
    const profile = this.userProfiles.get(phoneNumber);
    profile.lastContact = new Date();
    profile.messageCount += 1;
    
    return profile;
  }

  getUserProfileInfo(phoneNumber) {
    const profile = this.getUserProfile(phoneNumber);
    return `Profile: ${profile.messageCount} messages since ${profile.firstContact.toDateString()}. Subscription: ${profile.subscription}`;
  }

  // Helper methods for commands
  getHelpMessage() {
    return `LEX AI Commands:
/help - Show this message
/status - System status
/budget - Budget usage
/clear - Clear chat history
/profile - Your profile info
/models - Available AI models

Just text me naturally for:
• Coding help & debugging
• Image analysis (send photos)
• General questions
• Creative tasks`;
  }

  async getStatusMessage() {
    try {
      const available = await budgetManager.getAvailableServices();
      return `LEX Status: Online ✅
Available models: ${available.length}
Phone: ${this.phoneNumber}
Ready to help!`;
    } catch (error) {
      return "LEX Status: Online ✅\nReady to help!";
    }
  }

  async getBudgetStatus() {
    try {
      const status = await budgetManager.getBudgetStatus();
      return `Budget Status:
Global: $${status.global.used.toFixed(2)}/$${status.global.limit}
Remaining: $${status.global.remaining.toFixed(2)}
Reset: ${new Date(status.resetDate).toDateString()}`;
    } catch (error) {
      return "Budget info unavailable right now.";
    }
  }

  getAvailableModels() {
    const models = multiModelCodingService.getModelStatus();
    const available = models.filter(m => m.enabled && m.available);
    return `Available Models:
${available.map(m => `• ${m.name} (${m.cost} cost)`).join('\n')}

Text me for coding, vision, or general AI help!`;
  }

  // Broadcast message to multiple numbers
  async broadcast(phoneNumbers, message, options = {}) {
    const results = [];
    
    for (const number of phoneNumbers) {
      try {
        const result = await this.sendSMS(number, message, options);
        results.push({ number, success: true, ...result });
      } catch (error) {
        results.push({ number, success: false, error: error.message });
      }
      
      // Rate limiting - small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    return results;
  }

  // Schedule message (basic implementation)
  async scheduleMessage(to, message, sendAt, options = {}) {
    const delay = new Date(sendAt) - new Date();
    
    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }
    
    const timeoutId = setTimeout(async () => {
      try {
        await this.sendSMS(to, message, options);
        console.log(`Scheduled message sent to ${to}`);
      } catch (error) {
        console.error(`Failed to send scheduled message to ${to}:`, error);
      }
    }, delay);
    
    return {
      success: true,
      scheduledFor: sendAt,
      timeoutId,
      message: 'Message scheduled successfully'
    };
  }

  // Get message history
  async getMessageHistory(phoneNumber = null, limit = 50) {
    try {
      const messages = await this.client.messages.list({
        limit: limit,
        ...(phoneNumber && { from: phoneNumber })
      });
      
      return messages.map(msg => ({
        sid: msg.sid,
        from: msg.from,
        to: msg.to,
        body: msg.body,
        status: msg.status,
        direction: msg.direction,
        dateCreated: msg.dateCreated,
        dateSent: msg.dateSent
      }));
    } catch (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
  }

  // Analytics
  async getAnalytics() {
    const totalConversations = this.conversationHistory.size;
    const totalMessages = Array.from(this.conversationHistory.values())
      .reduce((sum, history) => sum + history.length, 0);
    
    const userStats = Array.from(this.userProfiles.values()).map(profile => ({
      phoneNumber: profile.phoneNumber,
      messageCount: profile.messageCount,
      firstContact: profile.firstContact,
      lastContact: profile.lastContact
    }));

    return {
      totalConversations,
      totalMessages,
      activeUsers: this.userProfiles.size,
      userStats: userStats.slice(0, 10) // Top 10 users
    };
  }
}

// Create singleton instance
const twilioService = new TwilioService();

export default twilioService;