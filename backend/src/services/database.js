import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '../../data/lexos.db');
  }

  async initialize() {
    // Ensure data directory exists
    const dataDir = path.dirname(this.dbPath);
    await fs.mkdir(dataDir, { recursive: true });

    // Open database connection with better-sqlite3 for performance
    this.db = new Database(this.dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : null
    });

    // Production SQLite optimizations
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = 1000000');
    this.db.pragma('temp_store = memory');
    this.db.pragma('mmap_size = 268435456'); // 256MB
    this.db.pragma('foreign_keys = ON');

    // Create tables
    this.createTables();
    
    // Initialize Overlord user
    this.initializeOverlord();
    
    // Setup backup interval if enabled
    if (process.env.ENABLE_DB_BACKUP === 'true') {
      this.setupBackupInterval();
    }
    
    console.log('Database initialized successfully with production optimizations');
  }

  setupBackupInterval() {
    const backupInterval = parseInt(process.env.BACKUP_INTERVAL) || 3600000; // 1 hour default
    setInterval(() => {
      this.createBackup();
    }, backupInterval);
  }

  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(path.dirname(this.dbPath), `../backups/lexos_backup_${timestamp}.db`);
      
      // Ensure backup directory exists
      fs.mkdir(path.dirname(backupPath), { recursive: true });
      
      // Create backup using better-sqlite3's backup method
      this.db.backup(backupPath);
      console.log(`Database backup created: ${backupPath}`);
    } catch (error) {
      console.error('Failed to create database backup:', error);
    }
  }

  createTables() {
    // Users table with special recognition for Overlord
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password_hash TEXT,
        role TEXT DEFAULT 'user',
        is_overlord BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // Agent profiles with unique personalities
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        personality TEXT NOT NULL,
        backstory TEXT,
        traits TEXT,
        capabilities TEXT,
        model TEXT,
        status TEXT DEFAULT 'inactive',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // Chat logs
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id INTEGER,
        agent_id TEXT,
        message TEXT NOT NULL,
        role TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
      )
    `);

    // Agent memory system
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        memory_type TEXT NOT NULL,
        content TEXT NOT NULL,
        importance REAL DEFAULT 0.5,
        embedding TEXT,
        context TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        metadata TEXT,
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
      )
    `);

    // User profiles and preferences
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id INTEGER PRIMARY KEY,
        display_name TEXT,
        bio TEXT,
        preferences TEXT,
        achievements TEXT,
        interaction_style TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // LLM models catalog
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS llm_models (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        model_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        provider TEXT NOT NULL,
        category TEXT,
        capabilities TEXT,
        parameters TEXT,
        context_length INTEGER,
        is_available BOOLEAN DEFAULT 1,
        performance_metrics TEXT,
        usage_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // System events and logs
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'info',
        source TEXT,
        message TEXT NOT NULL,
        context TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `);

    // Agent relationships and interactions
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent1_id TEXT NOT NULL,
        agent2_id TEXT NOT NULL,
        relationship_type TEXT,
        strength REAL DEFAULT 0.5,
        history TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent1_id) REFERENCES agents(agent_id),
        FOREIGN KEY (agent2_id) REFERENCES agents(agent_id)
      )
    `);

    // Create indexes for performance
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_user ON chat_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_agent ON chat_logs(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
    `);
  }

  initializeOverlord() {
    // Check if Overlord already exists
    const overlord = this.db.prepare('SELECT * FROM users WHERE username = ?').get('vince.sharma');

    if (!overlord) {
      const stmt = this.db.prepare(`INSERT INTO users (username, email, role, is_overlord, metadata) 
         VALUES (?, ?, ?, ?, ?)`);
      stmt.run(
          'vince.sharma',
          'vince@lexos.tech',
          'overlord',
          1,
          JSON.stringify({
            title: 'System Overlord',
            privileges: ['all'],
            recognition: 'Supreme Commander of LEXOS Genesis',
            established: new Date().toISOString()
          })
      );

      this.logSystemEvent(
        'system',
        'info',
        'DatabaseService',
        'Overlord Vince Sharma recognized and initialized'
      );
    }
  }

  // User Management
  async createUser(username, email, passwordHash, role = 'user') {
    const result = await this.db.run(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES (?, ?, ?, ?)`,
      [username, email, passwordHash, role]
    );
    
    await this.logSystemEvent(
      'user',
      'info',
      'DatabaseService',
      `New user created: ${username}`
    );
    
    return result.lastID;
  }

  async getUser(identifier) {
    return await this.db.get(
      `SELECT * FROM users WHERE id = ? OR username = ? OR email = ?`,
      [identifier, identifier, identifier]
    );
  }

  async updateUserActivity(userId) {
    await this.db.run(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  // Agent Management
  async createAgent(agentData) {
    const {
      agent_id,
      name,
      type,
      personality,
      backstory,
      traits,
      capabilities,
      model
    } = agentData;

    const result = await this.db.run(
      `INSERT INTO agents (agent_id, name, type, personality, backstory, traits, capabilities, model, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agent_id,
        name,
        type,
        personality,
        backstory,
        JSON.stringify(traits),
        JSON.stringify(capabilities),
        model,
        JSON.stringify(agentData.metadata || {})
      ]
    );

    await this.logSystemEvent(
      'agent',
      'info',
      'DatabaseService',
      `New agent created: ${name} (${agent_id})`
    );

    return result.lastID;
  }

  async getAgent(agentId) {
    const agent = await this.db.get(
      'SELECT * FROM agents WHERE agent_id = ?',
      [agentId]
    );
    
    if (agent) {
      agent.traits = JSON.parse(agent.traits || '[]');
      agent.capabilities = JSON.parse(agent.capabilities || '[]');
      agent.metadata = JSON.parse(agent.metadata || '{}');
    }
    
    return agent;
  }

  async getAllAgents() {
    const agents = await this.db.all('SELECT * FROM agents');
    return agents.map(agent => ({
      ...agent,
      traits: JSON.parse(agent.traits || '[]'),
      capabilities: JSON.parse(agent.capabilities || '[]'),
      metadata: JSON.parse(agent.metadata || '{}')
    }));
  }

  async updateAgentStatus(agentId, status) {
    await this.db.run(
      `UPDATE agents SET status = ?, last_active = CURRENT_TIMESTAMP 
       WHERE agent_id = ?`,
      [status, agentId]
    );
  }

  // Chat Management
  async saveChatMessage(sessionId, userId, agentId, message, role, metadata = {}) {
    const result = await this.db.run(
      `INSERT INTO chat_logs (session_id, user_id, agent_id, message, role, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, userId, agentId, message, role, JSON.stringify(metadata)]
    );
    
    return result.lastID;
  }

  async getChatHistory(sessionId, limit = 100) {
    return await this.db.all(
      `SELECT cl.*, u.username, a.name as agent_name 
       FROM chat_logs cl
       LEFT JOIN users u ON cl.user_id = u.id
       LEFT JOIN agents a ON cl.agent_id = a.agent_id
       WHERE cl.session_id = ?
       ORDER BY cl.timestamp DESC
       LIMIT ?`,
      [sessionId, limit]
    );
  }

  async getUserChatSessions(userId, limit = 20) {
    return await this.db.all(
      `SELECT DISTINCT session_id, MAX(timestamp) as last_message, COUNT(*) as message_count
       FROM chat_logs
       WHERE user_id = ?
       GROUP BY session_id
       ORDER BY last_message DESC
       LIMIT ?`,
      [userId, limit]
    );
  }

  // Memory Management
  async saveAgentMemory(agentId, memoryType, content, importance = 0.5, context = null) {
    const result = await this.db.run(
      `INSERT INTO agent_memory (agent_id, memory_type, content, importance, context) 
       VALUES (?, ?, ?, ?, ?)`,
      [agentId, memoryType, content, importance, context]
    );
    
    return result.lastID;
  }

  async getAgentMemories(agentId, memoryType = null, limit = 100) {
    let query = 'SELECT * FROM agent_memory WHERE agent_id = ?';
    const params = [agentId];
    
    if (memoryType) {
      query += ' AND memory_type = ?';
      params.push(memoryType);
    }
    
    query += ' ORDER BY importance DESC, accessed_at DESC LIMIT ?';
    params.push(limit);
    
    return await this.db.all(query, params);
  }

  async updateMemoryAccess(memoryId) {
    await this.db.run(
      `UPDATE agent_memory 
       SET accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1 
       WHERE id = ?`,
      [memoryId]
    );
  }

  // LLM Model Management
  async addLLMModel(modelData) {
    const {
      model_id,
      name,
      provider,
      category,
      capabilities,
      parameters,
      context_length,
      usage_notes
    } = modelData;

    const result = await this.db.run(
      `INSERT INTO llm_models (model_id, name, provider, category, capabilities, parameters, context_length, usage_notes, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        model_id,
        name,
        provider,
        category,
        JSON.stringify(capabilities),
        JSON.stringify(parameters),
        context_length,
        usage_notes,
        JSON.stringify(modelData.metadata || {})
      ]
    );

    await this.logSystemEvent(
      'model',
      'info',
      'DatabaseService',
      `New LLM model added: ${name} (${model_id})`
    );

    return result.lastID;
  }

  async getLLMModel(modelId) {
    const model = await this.db.get(
      'SELECT * FROM llm_models WHERE model_id = ?',
      [modelId]
    );
    
    if (model) {
      model.capabilities = JSON.parse(model.capabilities || '[]');
      model.parameters = JSON.parse(model.parameters || '{}');
      model.metadata = JSON.parse(model.metadata || '{}');
    }
    
    return model;
  }

  async getAllLLMModels() {
    const models = await this.db.all('SELECT * FROM llm_models WHERE is_available = 1');
    return models.map(model => ({
      ...model,
      capabilities: JSON.parse(model.capabilities || '[]'),
      parameters: JSON.parse(model.parameters || '{}'),
      metadata: JSON.parse(model.metadata || '{}')
    }));
  }

  // System Logging
  logSystemEvent(eventType, severity, source, message, context = null) {
    const stmt = this.db.prepare(`INSERT INTO system_logs (event_type, severity, source, message, context) 
       VALUES (?, ?, ?, ?, ?)`);
    stmt.run(eventType, severity, source, message, context ? JSON.stringify(context) : null);
  }

  async getSystemLogs(filters = {}, limit = 100) {
    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params = [];
    
    if (filters.eventType) {
      query += ' AND event_type = ?';
      params.push(filters.eventType);
    }
    
    if (filters.severity) {
      query += ' AND severity = ?';
      params.push(filters.severity);
    }
    
    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }
    
    if (filters.since) {
      query += ' AND timestamp >= ?';
      params.push(filters.since);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    return await this.db.all(query, params);
  }

  // Agent Relationships
  async createAgentRelationship(agent1Id, agent2Id, relationshipType, strength = 0.5) {
    const result = await this.db.run(
      `INSERT INTO agent_relationships (agent1_id, agent2_id, relationship_type, strength) 
       VALUES (?, ?, ?, ?)`,
      [agent1Id, agent2Id, relationshipType, strength]
    );
    
    return result.lastID;
  }

  async getAgentRelationships(agentId) {
    return await this.db.all(
      `SELECT * FROM agent_relationships 
       WHERE agent1_id = ? OR agent2_id = ?
       ORDER BY strength DESC`,
      [agentId, agentId]
    );
  }

  async updateRelationshipStrength(relationshipId, newStrength) {
    await this.db.run(
      `UPDATE agent_relationships 
       SET strength = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newStrength, relationshipId]
    );
  }

  // Close database connection
  async close() {
    if (this.db) {
      await this.db.close();
      console.log('Database connection closed');
    }
  }
}

// Export singleton instance
export default new DatabaseService();