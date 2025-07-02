import { EventEmitter } from 'events';
import database from './database.js';

/**
 * Vector Memory Store for RAG (Retrieval-Augmented Generation)
 * Provides contextual memory and retrieval capabilities for agents
 */
class VectorMemory extends EventEmitter {
  constructor() {
    super();
    this.memories = new Map();
    this.embeddings = new Map();
    this.similarityThreshold = 0.75;
    this.maxMemories = 1000;
    this.initialized = false;
  }

  /**
   * Initialize the vector memory system
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Create vector memory table if it doesn't exist
      await this.createMemoryTable();
      
      // Load existing memories from database
      await this.loadMemoriesFromDatabase();
      
      this.initialized = true;
      console.log('📚 Vector Memory Store initialized');
      
    } catch (error) {
      console.error('Failed to initialize vector memory:', error);
      throw error;
    }
  }

  /**
   * Create memory storage table
   */
  async createMemoryTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vector_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        agent_id TEXT NOT NULL,
        content TEXT NOT NULL,
        context TEXT,
        embedding TEXT,
        metadata TEXT,
        relevance_score REAL DEFAULT 1.0,
        access_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    database.run(createTableSQL);
    
    // Create index for faster retrieval
    database.run(`
      CREATE INDEX IF NOT EXISTS idx_vector_memories_agent 
      ON vector_memories(agent_id)
    `);
  }

  /**
   * Load existing memories from database
   */
  async loadMemoriesFromDatabase() {
    try {
      const memories = database.all(`
        SELECT * FROM vector_memories 
        ORDER BY relevance_score DESC, last_accessed DESC 
        LIMIT ?
      `, [this.maxMemories]);

      for (const memory of memories) {
        this.memories.set(memory.id, {
          id: memory.id,
          agentId: memory.agent_id,
          content: memory.content,
          context: memory.context,
          embedding: memory.embedding ? JSON.parse(memory.embedding) : null,
          metadata: memory.metadata ? JSON.parse(memory.metadata) : {},
          relevanceScore: memory.relevance_score,
          accessCount: memory.access_count,
          createdAt: new Date(memory.created_at),
          lastAccessed: new Date(memory.last_accessed)
        });
      }

      console.log(`📚 Loaded ${memories.length} memories from database`);
    } catch (error) {
      console.error('Failed to load memories:', error);
    }
  }

  /**
   * Store a new memory with context
   */
  async storeMemory(agentId, content, context = null, metadata = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Generate simple embedding (in production, use a proper embedding model)
      const embedding = this.generateSimpleEmbedding(content);
      
      // Check for similar existing memories to avoid duplicates
      const existingSimilar = await this.findSimilarMemories(agentId, content, 0.9);
      if (existingSimilar.length > 0) {
        console.log(`📚 Similar memory already exists, updating relevance`);
        return this.updateMemoryRelevance(existingSimilar[0].id);
      }

      // Store in database
      const result = database.run(`
        INSERT INTO vector_memories (agent_id, content, context, embedding, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [
        agentId,
        content,
        context,
        JSON.stringify(embedding),
        JSON.stringify(metadata)
      ]);

      // Store in memory
      const memory = {
        id: result.lastID,
        agentId,
        content,
        context,
        embedding,
        metadata,
        relevanceScore: 1.0,
        accessCount: 0,
        createdAt: new Date(),
        lastAccessed: new Date()
      };

      this.memories.set(result.lastID, memory);

      // Cleanup old memories if we exceed the limit
      if (this.memories.size > this.maxMemories) {
        await this.cleanupOldMemories();
      }

      this.emit('memory_stored', { agentId, memoryId: result.lastID, content });
      
      return result.lastID;

    } catch (error) {
      console.error('Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve relevant memories for a query
   */
  async retrieveMemories(agentId, query, limit = 5) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const queryEmbedding = this.generateSimpleEmbedding(query);
      const relevantMemories = [];

      // Find memories for this agent
      for (const memory of this.memories.values()) {
        if (memory.agentId === agentId) {
          const similarity = this.calculateSimilarity(queryEmbedding, memory.embedding);
          
          if (similarity >= this.similarityThreshold) {
            relevantMemories.push({
              ...memory,
              similarity
            });
          }
        }
      }

      // Sort by similarity and limit results
      relevantMemories.sort((a, b) => b.similarity - a.similarity);
      const topMemories = relevantMemories.slice(0, limit);

      // Update access counts
      for (const memory of topMemories) {
        await this.updateMemoryAccess(memory.id);
      }

      this.emit('memories_retrieved', { 
        agentId, 
        query, 
        count: topMemories.length,
        avgSimilarity: topMemories.reduce((sum, m) => sum + m.similarity, 0) / topMemories.length || 0
      });

      return topMemories;

    } catch (error) {
      console.error('Failed to retrieve memories:', error);
      return [];
    }
  }

  /**
   * Find similar memories to avoid duplicates
   */
  async findSimilarMemories(agentId, content, threshold = 0.8) {
    const contentEmbedding = this.generateSimpleEmbedding(content);
    const similarMemories = [];

    for (const memory of this.memories.values()) {
      if (memory.agentId === agentId) {
        const similarity = this.calculateSimilarity(contentEmbedding, memory.embedding);
        if (similarity >= threshold) {
          similarMemories.push({ ...memory, similarity });
        }
      }
    }

    return similarMemories.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Generate a simple text embedding (in production, use a proper model like SentenceTransformers)
   */
  generateSimpleEmbedding(text) {
    // This is a very basic embedding - in production you'd use:
    // - sentence-transformers
    // - OpenAI embeddings API
    // - Local embedding models like all-MiniLM-L6-v2
    
    const words = text.toLowerCase().split(/\W+/);
    const wordCounts = {};
    
    // Count word frequencies
    for (const word of words) {
      if (word.length > 2) { // Skip short words
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    }

    // Create a simple vector from top words
    const topWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50)
      .map(([word, count]) => ({ word, count }));

    // Generate fixed-size vector (128 dimensions)
    const vector = new Array(128).fill(0);
    for (let i = 0; i < topWords.length && i < 128; i++) {
      vector[i] = topWords[i].count / words.length; // Normalize by text length
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateSimilarity(vectorA, vectorB) {
    if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Update memory access tracking
   */
  async updateMemoryAccess(memoryId) {
    try {
      database.run(`
        UPDATE vector_memories 
        SET access_count = access_count + 1, 
            last_accessed = CURRENT_TIMESTAMP,
            relevance_score = relevance_score + 0.01
        WHERE id = ?
      `, [memoryId]);

      // Update in-memory record
      if (this.memories.has(memoryId)) {
        const memory = this.memories.get(memoryId);
        memory.accessCount++;
        memory.lastAccessed = new Date();
        memory.relevanceScore += 0.01;
      }
    } catch (error) {
      console.error('Failed to update memory access:', error);
    }
  }

  /**
   * Update memory relevance score
   */
  async updateMemoryRelevance(memoryId, score = 0.05) {
    try {
      database.run(`
        UPDATE vector_memories 
        SET relevance_score = relevance_score + ?,
            last_accessed = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [score, memoryId]);

      if (this.memories.has(memoryId)) {
        const memory = this.memories.get(memoryId);
        memory.relevanceScore += score;
        memory.lastAccessed = new Date();
      }

      return memoryId;
    } catch (error) {
      console.error('Failed to update memory relevance:', error);
    }
  }

  /**
   * Clean up old, unused memories
   */
  async cleanupOldMemories() {
    try {
      // Remove oldest, least accessed memories
      const memoriesToRemove = Array.from(this.memories.values())
        .sort((a, b) => {
          // Sort by relevance score and last accessed
          const scoreA = a.relevanceScore * 0.7 + (a.accessCount / 100) * 0.3;
          const scoreB = b.relevanceScore * 0.7 + (b.accessCount / 100) * 0.3;
          return scoreA - scoreB;
        })
        .slice(0, Math.floor(this.maxMemories * 0.1)); // Remove 10% of memories

      for (const memory of memoriesToRemove) {
        database.run('DELETE FROM vector_memories WHERE id = ?', [memory.id]);
        this.memories.delete(memory.id);
      }

      console.log(`🗑️ Cleaned up ${memoriesToRemove.length} old memories`);
    } catch (error) {
      console.error('Failed to cleanup memories:', error);
    }
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const agentStats = {};
    
    for (const memory of this.memories.values()) {
      if (!agentStats[memory.agentId]) {
        agentStats[memory.agentId] = {
          count: 0,
          totalAccess: 0,
          avgRelevance: 0
        };
      }
      
      agentStats[memory.agentId].count++;
      agentStats[memory.agentId].totalAccess += memory.accessCount;
      agentStats[memory.agentId].avgRelevance += memory.relevanceScore;
    }

    // Calculate averages
    for (const agentId in agentStats) {
      const stats = agentStats[agentId];
      stats.avgRelevance = stats.avgRelevance / stats.count;
      stats.avgAccess = stats.totalAccess / stats.count;
    }

    return {
      totalMemories: this.memories.size,
      maxMemories: this.maxMemories,
      similarityThreshold: this.similarityThreshold,
      agentStats
    };
  }

  /**
   * Enhanced memory retrieval with context
   */
  async getContextualMemories(agentId, query, context = null) {
    const memories = await this.retrieveMemories(agentId, query);
    
    // If context is provided, also search by context
    if (context) {
      const contextMemories = await this.retrieveMemories(agentId, context);
      
      // Merge and deduplicate
      const allMemories = [...memories];
      for (const contextMemory of contextMemories) {
        if (!allMemories.find(m => m.id === contextMemory.id)) {
          allMemories.push({ ...contextMemory, similarity: contextMemory.similarity * 0.8 });
        }
      }
      
      return allMemories.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
    }
    
    return memories;
  }
}

export default new VectorMemory();