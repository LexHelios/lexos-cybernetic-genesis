import { v4 as uuidv4 } from 'uuid';
import database from './database.js';
import memoryManager from './memoryManager.js';
import agentPersonality from './agentPersonality.js';

class ChatService {
  constructor() {
    this.activeSessions = new Map();
  }

  // Create a new chat session
  async createSession(userId, agentId, metadata = {}) {
    const sessionId = uuidv4();
    
    const session = {
      session_id: sessionId,
      user_id: userId,
      agent_id: agentId,
      started_at: Date.now(),
      last_activity: Date.now(),
      message_count: 0,
      metadata
    };

    this.activeSessions.set(sessionId, session);

    // Check if user is the Overlord
    const isOverlord = await agentPersonality.checkOverlordStatus(userId);
    if (isOverlord) {
      // Log special recognition
      await database.logSystemEvent(
        'chat',
        'info',
        'ChatService',
        `Overlord Vince Sharma has initiated communication with ${agentId}`,
        { sessionId, agentId }
      );

      // Create a special memory for the agent
      await memoryManager.createMemory(
        agentId,
        memoryManager.memoryTypes.SOCIAL,
        'The Overlord has graced me with their presence.',
        {
          involves_overlord: true,
          user_emphasis: true,
          emotional_intensity: 0.9,
          permanent: true
        }
      );
    }

    return sessionId;
  }

  // Process a chat message
  async processMessage(sessionId, message, role = 'user') {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session ID');
    }

    // Update session activity
    session.last_activity = Date.now();
    session.message_count++;

    // Save message to database
    const messageId = await database.saveChatMessage(
      sessionId,
      session.user_id,
      session.agent_id,
      message,
      role,
      {
        timestamp: Date.now(),
        session_metadata: session.metadata
      }
    );

    // Create memory for the agent if it's a user message
    if (role === 'user') {
      const isOverlord = await agentPersonality.checkOverlordStatus(session.user_id);
      
      // Analyze message for memory creation
      const memoryContext = {
        session_id: sessionId,
        message_id: messageId,
        involves_overlord: isOverlord
      };

      // Create episodic memory of the conversation
      await memoryManager.createMemory(
        session.agent_id,
        memoryManager.memoryTypes.EPISODIC,
        `User said: "${message}"`,
        memoryContext
      );

      // Check for important information to remember
      if (this.isImportantInformation(message)) {
        await memoryManager.createMemory(
          session.agent_id,
          memoryManager.memoryTypes.SEMANTIC,
          `Important information from user: "${message}"`,
          {
            ...memoryContext,
            user_emphasis: true
          }
        );
      }
    }

    return messageId;
  }

  // Generate agent response with personality
  async generateAgentResponse(sessionId, userMessage, agent, options = {}) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Invalid session ID');
    }

    // Check if user is the Overlord
    const isOverlord = await agentPersonality.checkOverlordStatus(session.user_id);

    // Get relevant memories for context
    const relevantMemories = await memoryManager.searchMemories(
      session.agent_id,
      userMessage,
      { limit: 5 }
    );

    // Get recent conversation history
    const recentHistory = await database.getChatHistory(sessionId, 10);

    // Build context for the agent
    const context = {
      userId: session.user_id,
      isOverlord,
      sessionId,
      memories: relevantMemories,
      recentHistory: recentHistory.reverse(), // Chronological order
      ...options
    };

    // Get personality-appropriate greeting if this is first message
    let response;
    if (session.message_count === 1 && isOverlord) {
      const greeting = await agentPersonality.getOverlordInteraction(
        session.agent_id,
        'greeting'
      );
      response = greeting + '\n\n' + await agent.processTask({
        task_type: 'chat',
        parameters: { message: userMessage, context }
      });
    } else {
      // Normal response generation
      response = await agent.processTask({
        task_type: 'chat',
        parameters: { message: userMessage, context }
      });
    }

    // Apply personality modifications
    response = agentPersonality.personalizeResponse(
      session.agent_id,
      response,
      context
    );

    // Save agent response
    await this.processMessage(sessionId, response, 'assistant');

    // Create memory of the interaction outcome
    await memoryManager.createSocialMemory(
      session.agent_id,
      session.user_id,
      'chat_interaction',
      'positive' // This could be analyzed from sentiment
    );

    return response;
  }

  // Check if message contains important information
  isImportantInformation(message) {
    const importantPatterns = [
      /my name is/i,
      /remember/i,
      /important/i,
      /don't forget/i,
      /always/i,
      /never/i,
      /preference/i,
      /i like/i,
      /i hate/i,
      /overlord/i,
      /vince sharma/i
    ];

    return importantPatterns.some(pattern => pattern.test(message));
  }

  // Get session information
  getSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    return session;
  }

  // End a chat session
  async endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Log session end
    await database.logSystemEvent(
      'chat',
      'info',
      'ChatService',
      `Chat session ended: ${sessionId}`,
      {
        user_id: session.user_id,
        agent_id: session.agent_id,
        duration: Date.now() - session.started_at,
        message_count: session.message_count
      }
    );

    // Create a memory of the session for the agent
    await memoryManager.createMemory(
      session.agent_id,
      memoryManager.memoryTypes.EPISODIC,
      `Completed chat session with user. Duration: ${Math.round((Date.now() - session.started_at) / 1000)} seconds, Messages: ${session.message_count}`,
      {
        session_id: sessionId,
        user_id: session.user_id,
        session_summary: true
      }
    );

    // Remove from active sessions
    this.activeSessions.delete(sessionId);

    return {
      success: true,
      session_id: sessionId,
      duration: Date.now() - session.started_at,
      message_count: session.message_count
    };
  }

  // Get active sessions for a user
  getUserActiveSessions(userId) {
    const userSessions = [];
    this.activeSessions.forEach((session, sessionId) => {
      if (session.user_id === userId) {
        userSessions.push({
          session_id: sessionId,
          ...session
        });
      }
    });
    return userSessions;
  }

  // Clean up inactive sessions
  async cleanupInactiveSessions(inactivityThreshold = 30 * 60 * 1000) { // 30 minutes
    const now = Date.now();
    const sessionsToEnd = [];

    this.activeSessions.forEach((session, sessionId) => {
      if (now - session.last_activity > inactivityThreshold) {
        sessionsToEnd.push(sessionId);
      }
    });

    for (const sessionId of sessionsToEnd) {
      await this.endSession(sessionId);
    }

    return sessionsToEnd.length;
  }

  // Get chat statistics
  async getChatStatistics() {
    const stats = {
      active_sessions: this.activeSessions.size,
      sessions_by_agent: {},
      total_messages_today: 0,
      average_session_duration: 0
    };

    // Count active sessions by agent
    this.activeSessions.forEach(session => {
      stats.sessions_by_agent[session.agent_id] = 
        (stats.sessions_by_agent[session.agent_id] || 0) + 1;
    });

    // Get today's message count from database
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayLogs = await database.getSystemLogs({
      eventType: 'chat',
      since: todayStart.toISOString()
    }, 1000);

    stats.total_messages_today = todayLogs.filter(log => 
      log.message.includes('Chat session')
    ).length;

    // Calculate average session duration
    let totalDuration = 0;
    let sessionCount = 0;
    
    this.activeSessions.forEach(session => {
      totalDuration += Date.now() - session.started_at;
      sessionCount++;
    });

    if (sessionCount > 0) {
      stats.average_session_duration = Math.round(totalDuration / sessionCount / 1000); // in seconds
    }

    return stats;
  }
}

export default new ChatService();