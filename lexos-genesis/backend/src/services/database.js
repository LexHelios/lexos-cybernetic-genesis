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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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
    this.db.exec(`
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

    // Semantic memory for facts and knowledge
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS semantic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        concept TEXT NOT NULL,
        definition TEXT NOT NULL,
        category TEXT,
        confidence REAL DEFAULT 0.5,
        importance REAL DEFAULT 0.5,
        source TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
      )
    `);

    // Procedural memory for skills and procedures
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS procedural_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        skill_name TEXT NOT NULL,
        skill_type TEXT,
        procedure_steps TEXT,
        proficiency_level REAL DEFAULT 0.5,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
      )
    `);

    // Episodic memory for events and experiences
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS episodic_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        session_id TEXT,
        event_type TEXT,
        content TEXT NOT NULL,
        importance REAL DEFAULT 0.5,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id)
      )
    `);

    // Create indexes for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chat_logs_session ON chat_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_user ON chat_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_logs_agent ON chat_logs(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
      CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_semantic_memory_agent ON semantic_memory(agent_id);
      CREATE INDEX IF NOT EXISTS idx_semantic_memory_concept ON semantic_memory(concept);
      CREATE INDEX IF NOT EXISTS idx_procedural_memory_agent ON procedural_memory(agent_id);
      CREATE INDEX IF NOT EXISTS idx_episodic_memory_agent ON episodic_memory(agent_id);
      CREATE INDEX IF NOT EXISTS idx_episodic_memory_session ON episodic_memory(session_id);
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
    const stmt = this.db.prepare(
      `INSERT INTO users (username, email, password_hash, role) 
       VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(username, email, passwordHash, role);
    
    this.logSystemEvent(
      'user',
      'info',
      'DatabaseService',
      `New user created: ${username}`
    );
    
    return result.lastID;
  }

  async getUser(identifier) {
    const stmt = this.db.prepare(
      `SELECT * FROM users WHERE id = ? OR username = ? OR email = ?`
    );
    return stmt.get(identifier, identifier, identifier);
  }

  async updateUserActivity(userId) {
    const stmt = this.db.prepare(
      'UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?'
    );
    stmt.run(userId);
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

    const stmt = this.db.prepare(
      `INSERT INTO agents (agent_id, name, type, personality, backstory, traits, capabilities, model, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      agent_id,
      name,
      type,
      personality,
      backstory,
      JSON.stringify(traits),
      JSON.stringify(capabilities),
      model,
      JSON.stringify(agentData.metadata || {})
    );

    // Initialize agent memory system
    await this.initializeAgentMemory(agent_id, {
      name,
      personality,
      backstory,
      traits,
      capabilities
    });

    // TODO: Implement logSystemEvent method
    // this.logSystemEvent(
    //   'agent',
    //   'info',
    //   'DatabaseService',
    //   `New agent created with memory system: ${name} (${agent_id})`
    // );

    return result.lastID;
  }

  // Initialize agent memory system
  async initializeAgentMemory(agentId, agentData) {
    try {
      // Store personality traits as semantic memories
      if (agentData.traits) {
        for (const [trait, value] of Object.entries(agentData.traits)) {
          this.run(`
            INSERT INTO semantic_memory (
              agent_id, concept, definition, category, confidence, importance, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            agentId,
            `personality_trait_${trait}`,
            `I have ${trait} with intensity ${value}`,
            'personality',
            0.9,
            0.8,
            'personality_initialization'
          ]);
        }
      }

      // Store capabilities as procedural memories
      if (agentData.capabilities) {
        for (const capability of agentData.capabilities) {
          this.run(`
            INSERT INTO procedural_memory (
              agent_id, skill_name, skill_type, procedure_steps, proficiency_level, metadata
            ) VALUES (?, ?, ?, ?, ?, ?)
          `, [
            agentId,
            capability,
            'capability',
            JSON.stringify([`Apply ${capability} to solve problems`]),
            0.7,
            JSON.stringify({source: 'personality_initialization'})
          ]);
        }
      }

      // Store backstory as episodic memory
      if (agentData.backstory) {
        this.run(`
          INSERT INTO episodic_memory (
            agent_id, session_id, event_type, content, importance, metadata
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          agentId,
          'initialization',
          'backstory',
          agentData.backstory,
          0.9,
          JSON.stringify({source: 'personality_initialization'})
        ]);
      }

      console.log(`Initialized memory system for agent ${agentId}`);
    } catch (error) {
      console.error(`Failed to initialize memory for agent ${agentId}:`, error);
    }
  }

  async getAgent(agentId) {
    const stmt = this.db.prepare(
      'SELECT * FROM agents WHERE agent_id = ?'
    );
    const agent = stmt.get(agentId);
    
    if (agent) {
      agent.traits = JSON.parse(agent.traits || '[]');
      agent.capabilities = JSON.parse(agent.capabilities || '[]');
      agent.metadata = JSON.parse(agent.metadata || '{}');
    }
    
    return agent;
  }

  async getAllAgents() {
    const stmt = this.db.prepare('SELECT * FROM agents');
    const agents = stmt.all();
    return agents.map(agent => ({
      ...agent,
      traits: JSON.parse(agent.traits || '[]'),
      capabilities: JSON.parse(agent.capabilities || '[]'),
      metadata: JSON.parse(agent.metadata || '{}')
    }));
  }

  async updateAgentStatus(agentId, status) {
    const stmt = this.db.prepare(
      `UPDATE agents SET status = ?, last_active = CURRENT_TIMESTAMP 
       WHERE agent_id = ?`
    );
    stmt.run(status, agentId);
  }

  // Chat Management
  async saveChatMessage(sessionId, userId, agentId, message, role, metadata = {}) {
    const stmt = this.db.prepare(
      `INSERT INTO chat_logs (session_id, user_id, agent_id, message, role, metadata) 
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(sessionId, userId, agentId, message, role, JSON.stringify(metadata));
    
    return result.lastID;
  }

  async getChatHistory(sessionId, limit = 100) {
    const stmt = this.db.prepare(
      `SELECT cl.*, u.username, a.name as agent_name 
       FROM chat_logs cl
       LEFT JOIN users u ON cl.user_id = u.id
       LEFT JOIN agents a ON cl.agent_id = a.agent_id
       WHERE cl.session_id = ?
       ORDER BY cl.timestamp DESC
       LIMIT ?`
    );
    return stmt.all(sessionId, limit);
  }

  async getUserChatSessions(userId, limit = 20) {
    const stmt = this.db.prepare(
      `SELECT DISTINCT session_id, MAX(timestamp) as last_message, COUNT(*) as message_count
       FROM chat_logs
       WHERE user_id = ?
       GROUP BY session_id
       ORDER BY last_message DESC
       LIMIT ?`
    );
    return stmt.all(userId, limit);
  }

  // Memory Management
  async saveAgentMemory(agentId, memoryType, content, importance = 0.5, context = null) {
    const stmt = this.db.prepare(
      `INSERT INTO agent_memory (agent_id, memory_type, content, importance, context) 
       VALUES (?, ?, ?, ?, ?)`
    );
    const result = stmt.run(agentId, memoryType, content, importance, context);
    
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
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  async updateMemoryAccess(memoryId) {
    const stmt = this.db.prepare(
      `UPDATE agent_memory 
       SET accessed_at = CURRENT_TIMESTAMP, access_count = access_count + 1 
       WHERE id = ?`
    );
    stmt.run(memoryId);
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

    const stmt = this.db.prepare(
      `INSERT INTO llm_models (model_id, name, provider, category, capabilities, parameters, context_length, usage_notes, metadata) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      model_id,
      name,
      provider,
      category,
      JSON.stringify(capabilities),
      JSON.stringify(parameters),
      context_length,
      usage_notes,
      JSON.stringify(modelData.metadata || {})
    );

    this.logSystemEvent(
      'model',
      'info',
      'DatabaseService',
      `New LLM model added: ${name} (${model_id})`
    );

    return result.lastID;
  }

  async getLLMModel(modelId) {
    const stmt = this.db.prepare(
      'SELECT * FROM llm_models WHERE model_id = ?'
    );
    const model = stmt.get(modelId);
    
    if (model) {
      model.capabilities = JSON.parse(model.capabilities || '[]');
      model.parameters = JSON.parse(model.parameters || '{}');
      model.metadata = JSON.parse(model.metadata || '{}');
    }
    
    return model;
  }

  async getAllLLMModels() {
    const stmt = this.db.prepare('SELECT * FROM llm_models WHERE is_available = 1');
    const models = stmt.all();
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
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // Agent Relationships
  async createAgentRelationship(agent1Id, agent2Id, relationshipType, strength = 0.5) {
    const stmt = this.db.prepare(
      `INSERT INTO agent_relationships (agent1_id, agent2_id, relationship_type, strength) 
       VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(agent1Id, agent2Id, relationshipType, strength);
    
    return result.lastID;
  }

  async getAgentRelationships(agentId) {
    const stmt = this.db.prepare(
      `SELECT * FROM agent_relationships 
       WHERE agent1_id = ? OR agent2_id = ?
       ORDER BY strength DESC`
    );
    return stmt.all(agentId, agentId);
  }

  async updateRelationshipStrength(relationshipId, newStrength) {
    const stmt = this.db.prepare(
      `UPDATE agent_relationships 
       SET strength = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`
    );
    stmt.run(newStrength, relationshipId);
  }

  // Raw database access methods for compatibility
  run(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql).run(params);
  }

  get(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql).get(params);
  }

  all(sql, params = []) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql).all(params);
  }

  exec(sql) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.exec(sql);
  }

  prepare(sql) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.prepare(sql);
  }

  // Close database connection
  async close() {
    if (this.db) {
      this.db.close();
      console.log('Database connection closed');
    }
  }
}

// Export singleton instance
export default new DatabaseService();