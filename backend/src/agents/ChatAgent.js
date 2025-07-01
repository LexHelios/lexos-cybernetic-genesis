import { EnhancedBaseAgent } from './EnhancedBaseAgent.js';

export class ChatAgent extends EnhancedBaseAgent {
  constructor(config) {
    super(config);
    this.conversationHistory = new Map();
    this.personality = {
      tone: 'friendly and professional',
      style: 'conversational',
      traits: ['helpful', 'knowledgeable', 'empathetic']
    };
  }
  
  async handleCustomTask(task) {
    switch (task.type) {
      case 'chat':
        return this.chat(task);
      case 'conversation':
        return this.continueConversation(task);
      case 'reset_context':
        return this.resetConversation(task);
      default:
        return super.handleCustomTask(task);
    }
  }
  
  async chat(task) {
    const { 
      message, 
      sessionId = 'default',
      context = null,
      mood = 'neutral'
    } = task;
    
    // Get conversation history
    const history = this.getConversationHistory(sessionId);
    
    const chatPrompt = `
You are a friendly AI assistant. Your personality is ${this.personality.tone}.

${history.length > 0 ? `Previous conversation:\n${this.formatHistory(history)}` : ''}
${context ? `Context: ${context}` : ''}
${mood !== 'neutral' ? `The user seems ${mood}.` : ''}

User: ${message}

Respond naturally and helpfully:`;

    const response = await this.generate(chatPrompt, {
      temperature: 0.7,
      max_tokens: 500
    });
    
    // Update conversation history
    this.addToHistory(sessionId, 'user', message);
    this.addToHistory(sessionId, 'assistant', response);
    
    return {
      response,
      sessionId,
      conversationLength: history.length + 2
    };
  }
  
  async continueConversation(task) {
    const { sessionId = 'default' } = task;
    const history = this.getConversationHistory(sessionId);
    
    if (history.length === 0) {
      return {
        response: "I don't have any previous conversation to continue. How can I help you today?",
        sessionId,
        conversationLength: 0
      };
    }
    
    const lastExchange = history.slice(-2);
    const continuationPrompt = `
Continue this conversation naturally:

${this.formatHistory(lastExchange)}

Provide a follow-up question or comment:`;

    const response = await this.generate(continuationPrompt, {
      temperature: 0.8,
      max_tokens: 200
    });
    
    this.addToHistory(sessionId, 'assistant', response);
    
    return {
      response,
      sessionId,
      conversationLength: history.length + 1
    };
  }
  
  async resetConversation(task) {
    const { sessionId = 'default' } = task;
    
    if (this.conversationHistory.has(sessionId)) {
      const previousLength = this.conversationHistory.get(sessionId).length;
      this.conversationHistory.delete(sessionId);
      
      return {
        success: true,
        message: 'Conversation reset successfully',
        previousLength
      };
    }
    
    return {
      success: false,
      message: 'No conversation to reset'
    };
  }
  
  getConversationHistory(sessionId) {
    if (!this.conversationHistory.has(sessionId)) {
      this.conversationHistory.set(sessionId, []);
    }
    return this.conversationHistory.get(sessionId);
  }
  
  addToHistory(sessionId, role, content) {
    const history = this.getConversationHistory(sessionId);
    history.push({
      role,
      content,
      timestamp: Date.now()
    });
    
    // Keep only last 20 messages
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }
  
  formatHistory(history) {
    return history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
  }
  
  setPersonality(personality) {
    this.personality = { ...this.personality, ...personality };
  }
  
  getActiveConversations() {
    const conversations = [];
    for (const [sessionId, history] of this.conversationHistory) {
      conversations.push({
        sessionId,
        messageCount: history.length,
        lastMessage: history[history.length - 1]?.timestamp || null
      });
    }
    return conversations;
  }
}