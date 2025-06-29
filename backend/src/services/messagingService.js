import EventEmitter from 'events';
import database from './database.js';
import taskPipelineWebSocket from './taskPipelineWebSocket.js';
import notificationService from './notificationService.js';
import { v4 as uuidv4 } from 'uuid';

class MessagingService extends EventEmitter {
  constructor() {
    super();
    this.conversations = new Map(); // conversationId -> conversation
    this.activeChats = new Map(); // userId/agentId -> Set of conversationIds
    this.typingStatus = new Map(); // conversationId -> Map of participantId -> status
  }

  async initialize() {
    await this.createTables();
    console.log('Messaging service initialized');
  }

  async createTables() {
    // Conversations table
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT,
        description TEXT,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // Conversation participants
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        participant_type TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_read_at DATETIME,
        notification_enabled BOOLEAN DEFAULT 1,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id),
        UNIQUE(conversation_id, participant_id)
      )
    `);

    // Messages table
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        content TEXT NOT NULL,
        attachments TEXT,
        edited BOOLEAN DEFAULT 0,
        edited_at DATETIME,
        deleted BOOLEAN DEFAULT 0,
        deleted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      )
    `);

    // Message reactions
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        reaction TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        UNIQUE(message_id, user_id, reaction)
      )
    `);

    // Message read receipts
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS message_read_receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        UNIQUE(message_id, user_id)
      )
    `);

    // Create indexes
    await database.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
      CREATE INDEX IF NOT EXISTS idx_conversation_participants_participant ON conversation_participants(participant_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
    `);
  }

  // Create a new conversation
  async createConversation(creatorId, type, participants, options = {}) {
    const {
      title = null,
      description = null,
      metadata = {}
    } = options;

    const conversationId = uuidv4();

    // Create conversation
    await database.db.run(
      `INSERT INTO conversations (id, type, title, description, created_by, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [conversationId, type, title, description, creatorId, JSON.stringify(metadata)]
    );

    // Add participants
    for (const participant of participants) {
      await database.db.run(
        `INSERT INTO conversation_participants (conversation_id, participant_id, participant_type, role)
         VALUES (?, ?, ?, ?)`,
        [conversationId, participant.id, participant.type, participant.role || 'member']
      );

      // Track active chats
      if (!this.activeChats.has(participant.id)) {
        this.activeChats.set(participant.id, new Set());
      }
      this.activeChats.get(participant.id).add(conversationId);
    }

    const conversation = {
      id: conversationId,
      type,
      title,
      description,
      createdBy: creatorId,
      participants,
      createdAt: new Date().toISOString(),
      metadata
    };

    this.conversations.set(conversationId, conversation);

    // Notify participants
    this.notifyParticipants(conversationId, 'conversation:created', {
      conversation,
      creatorId
    });

    this.emit('conversation:created', conversation);
    return conversation;
  }

  // Send a message
  async sendMessage(conversationId, senderId, senderType, content, options = {}) {
    const {
      messageType = 'text',
      attachments = [],
      metadata = {}
    } = options;

    const messageId = uuidv4();

    // Check if sender is participant
    const participant = await database.db.get(
      `SELECT * FROM conversation_participants 
       WHERE conversation_id = ? AND participant_id = ?`,
      [conversationId, senderId]
    );

    if (!participant) {
      throw new Error('Sender is not a participant in this conversation');
    }

    // Save message
    await database.db.run(
      `INSERT INTO messages (id, conversation_id, sender_id, sender_type, message_type, content, attachments, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        messageId,
        conversationId,
        senderId,
        senderType,
        messageType,
        content,
        JSON.stringify(attachments),
        JSON.stringify(metadata)
      ]
    );

    // Update conversation updated_at
    await database.db.run(
      `UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [conversationId]
    );

    const message = {
      id: messageId,
      conversationId,
      senderId,
      senderType,
      messageType,
      content,
      attachments,
      metadata,
      createdAt: new Date().toISOString(),
      edited: false,
      deleted: false
    };

    // Get conversation details
    const conversation = await this.getConversation(conversationId);

    // Notify participants
    this.notifyParticipants(conversationId, 'message:new', {
      message,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        type: conversation.type
      }
    }, senderId);

    // Create notifications for offline participants
    const participants = await database.db.all(
      `SELECT * FROM conversation_participants WHERE conversation_id = ? AND participant_id != ?`,
      [conversationId, senderId]
    );

    for (const participant of participants) {
      if (participant.notification_enabled && participant.participant_type === 'user') {
        await notificationService.createNotification(
          parseInt(participant.participant_id),
          'new_message',
          `New message in ${conversation.title || 'conversation'}`,
          content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          {
            data: {
              conversationId,
              messageId,
              senderId,
              senderType
            }
          }
        );
      }
    }

    this.emit('message:sent', message);
    return message;
  }

  // Get conversation
  async getConversation(conversationId) {
    const conversation = await database.db.get(
      'SELECT * FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (!conversation) {
      return null;
    }

    // Get participants
    const participants = await database.db.all(
      `SELECT * FROM conversation_participants WHERE conversation_id = ?`,
      [conversationId]
    );

    return {
      ...conversation,
      participants,
      metadata: JSON.parse(conversation.metadata || '{}')
    };
  }

  // Get user conversations
  async getUserConversations(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      type = null
    } = options;

    let query = `
      SELECT c.*, cp.last_read_at, cp.notification_enabled,
        (SELECT COUNT(*) FROM messages m 
         WHERE m.conversation_id = c.id AND m.created_at > cp.last_read_at) as unread_count,
        (SELECT content FROM messages 
         WHERE conversation_id = c.id 
         ORDER BY created_at DESC LIMIT 1) as last_message
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.participant_id = ?
    `;
    const params = [userId.toString()];

    if (type) {
      query += ' AND c.type = ?';
      params.push(type);
    }

    query += ' ORDER BY c.updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const conversations = await database.db.all(query, params);

    // Get participants for each conversation
    for (const conv of conversations) {
      const participants = await database.db.all(
        'SELECT * FROM conversation_participants WHERE conversation_id = ?',
        [conv.id]
      );
      conv.participants = participants;
      conv.metadata = JSON.parse(conv.metadata || '{}');
    }

    return conversations;
  }

  // Get conversation messages
  async getMessages(conversationId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      before = null
    } = options;

    let query = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM message_reactions WHERE message_id = m.id) as reaction_count,
        (SELECT COUNT(*) FROM message_read_receipts WHERE message_id = m.id) as read_count
      FROM messages m
      WHERE m.conversation_id = ? AND m.deleted = 0
    `;
    const params = [conversationId];

    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const messages = await database.db.all(query, params);

    return messages.map(msg => ({
      ...msg,
      attachments: JSON.parse(msg.attachments || '[]'),
      metadata: JSON.parse(msg.metadata || '{}'),
      edited: !!msg.edited,
      deleted: !!msg.deleted
    })).reverse(); // Reverse to get chronological order
  }

  // Mark messages as read
  async markAsRead(conversationId, userId, upToMessageId = null) {
    // Update last read timestamp
    await database.db.run(
      `UPDATE conversation_participants 
       SET last_read_at = CURRENT_TIMESTAMP 
       WHERE conversation_id = ? AND participant_id = ?`,
      [conversationId, userId.toString()]
    );

    // Add read receipts
    if (upToMessageId) {
      const messages = await database.db.all(
        `SELECT id FROM messages 
         WHERE conversation_id = ? AND id <= ? AND sender_id != ?`,
        [conversationId, upToMessageId, userId.toString()]
      );

      for (const message of messages) {
        await database.db.run(
          `INSERT OR IGNORE INTO message_read_receipts (message_id, user_id)
           VALUES (?, ?)`,
          [message.id, userId.toString()]
        );
      }
    }

    // Notify about read status
    this.notifyParticipants(conversationId, 'messages:read', {
      userId,
      upToMessageId
    });
  }

  // Edit message
  async editMessage(messageId, userId, newContent) {
    // Verify sender
    const message = await database.db.get(
      'SELECT * FROM messages WHERE id = ? AND sender_id = ?',
      [messageId, userId.toString()]
    );

    if (!message) {
      throw new Error('Message not found or you are not the sender');
    }

    await database.db.run(
      `UPDATE messages 
       SET content = ?, edited = 1, edited_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newContent, messageId]
    );

    // Notify participants
    this.notifyParticipants(message.conversation_id, 'message:edited', {
      messageId,
      newContent,
      editedBy: userId
    });
  }

  // Delete message
  async deleteMessage(messageId, userId) {
    // Verify sender
    const message = await database.db.get(
      'SELECT * FROM messages WHERE id = ? AND sender_id = ?',
      [messageId, userId.toString()]
    );

    if (!message) {
      throw new Error('Message not found or you are not the sender');
    }

    await database.db.run(
      `UPDATE messages 
       SET deleted = 1, deleted_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [messageId]
    );

    // Notify participants
    this.notifyParticipants(message.conversation_id, 'message:deleted', {
      messageId,
      deletedBy: userId
    });
  }

  // Add reaction to message
  async addReaction(messageId, userId, reaction) {
    await database.db.run(
      `INSERT OR IGNORE INTO message_reactions (message_id, user_id, reaction)
       VALUES (?, ?, ?)`,
      [messageId, userId.toString(), reaction]
    );

    const message = await database.db.get(
      'SELECT conversation_id FROM messages WHERE id = ?',
      [messageId]
    );

    if (message) {
      this.notifyParticipants(message.conversation_id, 'message:reaction', {
        messageId,
        userId,
        reaction,
        action: 'add'
      });
    }
  }

  // Remove reaction from message
  async removeReaction(messageId, userId, reaction) {
    await database.db.run(
      `DELETE FROM message_reactions 
       WHERE message_id = ? AND user_id = ? AND reaction = ?`,
      [messageId, userId.toString(), reaction]
    );

    const message = await database.db.get(
      'SELECT conversation_id FROM messages WHERE id = ?',
      [messageId]
    );

    if (message) {
      this.notifyParticipants(message.conversation_id, 'message:reaction', {
        messageId,
        userId,
        reaction,
        action: 'remove'
      });
    }
  }

  // Update typing status
  setTypingStatus(conversationId, userId, isTyping) {
    if (!this.typingStatus.has(conversationId)) {
      this.typingStatus.set(conversationId, new Map());
    }

    const convTyping = this.typingStatus.get(conversationId);
    
    if (isTyping) {
      convTyping.set(userId, {
        userId,
        startedAt: Date.now()
      });
    } else {
      convTyping.delete(userId);
    }

    // Notify participants
    this.notifyParticipants(conversationId, 'typing:status', {
      userId,
      isTyping
    }, userId);
  }

  // Get typing users in conversation
  getTypingUsers(conversationId) {
    const convTyping = this.typingStatus.get(conversationId);
    if (!convTyping) return [];

    const now = Date.now();
    const typingUsers = [];

    // Clean up old typing statuses (older than 10 seconds)
    for (const [userId, status] of convTyping.entries()) {
      if (now - status.startedAt > 10000) {
        convTyping.delete(userId);
      } else {
        typingUsers.push(userId);
      }
    }

    return typingUsers;
  }

  // Notify conversation participants
  async notifyParticipants(conversationId, eventType, data, excludeUserId = null) {
    const participants = await database.db.all(
      'SELECT participant_id, participant_type FROM conversation_participants WHERE conversation_id = ?',
      [conversationId]
    );

    for (const participant of participants) {
      if (participant.participant_id !== excludeUserId) {
        if (participant.participant_type === 'user') {
          taskPipelineWebSocket.sendToUser(parseInt(participant.participant_id), {
            type: eventType,
            data: {
              ...data,
              conversationId
            }
          });
        }
        // For agents, emit event that agent manager can handle
        else if (participant.participant_type === 'agent') {
          this.emit('agent:message', {
            agentId: participant.participant_id,
            eventType,
            data: {
              ...data,
              conversationId
            }
          });
        }
      }
    }
  }

  // Get conversation statistics
  async getConversationStats(conversationId) {
    const messageCount = await database.db.get(
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ? AND deleted = 0',
      [conversationId]
    );

    const participantCount = await database.db.get(
      'SELECT COUNT(*) as count FROM conversation_participants WHERE conversation_id = ?',
      [conversationId]
    );

    const messagesByType = await database.db.all(
      `SELECT message_type, COUNT(*) as count 
       FROM messages 
       WHERE conversation_id = ? AND deleted = 0 
       GROUP BY message_type`,
      [conversationId]
    );

    const mostActiveParticipants = await database.db.all(
      `SELECT sender_id, sender_type, COUNT(*) as message_count 
       FROM messages 
       WHERE conversation_id = ? AND deleted = 0 
       GROUP BY sender_id 
       ORDER BY message_count DESC 
       LIMIT 5`,
      [conversationId]
    );

    return {
      messageCount: messageCount.count,
      participantCount: participantCount.count,
      messagesByType,
      mostActiveParticipants
    };
  }

  // Search messages
  async searchMessages(userId, searchTerm, options = {}) {
    const {
      conversationId = null,
      limit = 50
    } = options;

    let query = `
      SELECT m.*, c.title as conversation_title, c.type as conversation_type
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.participant_id = ? AND m.deleted = 0 AND m.content LIKE ?
    `;
    const params = [userId.toString(), `%${searchTerm}%`];

    if (conversationId) {
      query += ' AND m.conversation_id = ?';
      params.push(conversationId);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const messages = await database.db.all(query, params);

    return messages.map(msg => ({
      ...msg,
      attachments: JSON.parse(msg.attachments || '[]'),
      metadata: JSON.parse(msg.metadata || '{}')
    }));
  }
}

export default new MessagingService();