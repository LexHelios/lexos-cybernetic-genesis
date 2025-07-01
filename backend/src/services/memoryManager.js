import database from './database.js';

class MemoryManager {
  constructor() {
    this.memoryTypes = {
      EPISODIC: 'episodic',      // Specific events and experiences
      SEMANTIC: 'semantic',      // Facts and knowledge
      PROCEDURAL: 'procedural',  // How to do things
      WORKING: 'working',        // Current context and active thoughts
      EMOTIONAL: 'emotional',    // Emotional states and associations
      SOCIAL: 'social'          // Interactions and relationships
    };

    this.importanceDecayRate = 0.99; // Daily decay
    this.consolidationThreshold = 0.7;
  }

  // Create a new memory
  async createMemory(agentId, type, content, context = {}) {
    const importance = this.calculateImportance(content, context);
    
    const memoryId = await database.saveAgentMemory(
      agentId,
      type,
      content,
      importance,
      JSON.stringify(context)
    );

    // Check if this memory should trigger consolidation
    if (importance > this.consolidationThreshold) {
      await this.consolidateMemories(agentId, type);
    }

    return memoryId;
  }

  // Calculate importance based on content and context
  calculateImportance(content, context) {
    let importance = 0.5; // Base importance

    // Increase importance for certain keywords
    const importantKeywords = ['important', 'critical', 'remember', 'never forget', 'overlord', 'vince sharma'];
    const lowerContent = content.toLowerCase();
    
    importantKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        importance += 0.1;
      }
    });

    // Context-based importance
    if (context.emotional_intensity) {
      importance += context.emotional_intensity * 0.2;
    }

    if (context.user_emphasis) {
      importance += 0.2;
    }

    if (context.involves_overlord) {
      importance = Math.max(importance, 0.9); // Overlord-related memories are always important
    }

    return Math.min(importance, 1.0);
  }

  // Retrieve memories for an agent
  async retrieveMemories(agentId, options = {}) {
    const {
      type = null,
      limit = 50,
      minImportance = 0,
      includeContext = true
    } = options;

    let memories = await database.getAgentMemories(agentId, type, limit);
    
    // Filter by importance
    memories = memories.filter(m => m.importance >= minImportance);

    // Update access for retrieved memories
    for (const memory of memories) {
      await database.updateMemoryAccess(memory.id);
    }

    // Parse context if needed
    if (includeContext) {
      memories = memories.map(m => ({
        ...m,
        context: JSON.parse(m.context || '{}')
      }));
    }

    return memories;
  }

  // Search memories by content
  async searchMemories(agentId, query, options = {}) {
    const allMemories = await this.retrieveMemories(agentId, {
      limit: 1000,
      ...options
    });

    // Simple text search - in production, this could use embeddings
    const queryLower = query.toLowerCase();
    const results = allMemories.filter(memory => 
      memory.content.toLowerCase().includes(queryLower)
    );

    // Sort by relevance (simple scoring based on match position and importance)
    results.sort((a, b) => {
      const aScore = a.importance + (1 / (a.content.toLowerCase().indexOf(queryLower) + 1));
      const bScore = b.importance + (1 / (b.content.toLowerCase().indexOf(queryLower) + 1));
      return bScore - aScore;
    });

    return results.slice(0, options.limit || 10);
  }

  // Consolidate memories to form higher-level understanding
  async consolidateMemories(agentId, type) {
    const recentMemories = await this.retrieveMemories(agentId, {
      type,
      limit: 20,
      minImportance: 0.5
    });

    if (recentMemories.length < 5) return; // Not enough memories to consolidate

    // Group similar memories
    const themes = this.extractThemes(recentMemories);
    
    // Create consolidated memories for strong themes
    for (const theme of themes) {
      if (theme.strength > 0.7) {
        const consolidatedContent = `Consolidated understanding: ${theme.summary}`;
        const consolidatedContext = {
          source: 'consolidation',
          original_memories: theme.memoryIds,
          theme: theme.name,
          consolidation_date: new Date().toISOString()
        };

        await this.createMemory(
          agentId,
          this.memoryTypes.SEMANTIC,
          consolidatedContent,
          consolidatedContext
        );
      }
    }
  }

  // Extract themes from memories (simplified version)
  extractThemes(memories) {
    // In a real implementation, this would use NLP/embeddings
    const themes = [];
    const commonWords = {};

    // Count word frequencies
    memories.forEach(memory => {
      const words = memory.content.toLowerCase().split(/\s+/);
      words.forEach(word => {
        if (word.length > 4) { // Only consider longer words
          commonWords[word] = (commonWords[word] || 0) + memory.importance;
        }
      });
    });

    // Create themes from common words
    Object.entries(commonWords)
      .filter(([_, score]) => score > 2)
      .forEach(([word, score]) => {
        const relatedMemories = memories.filter(m => 
          m.content.toLowerCase().includes(word)
        );
        
        themes.push({
          name: word,
          strength: score / memories.length,
          summary: `Pattern recognized around "${word}" across ${relatedMemories.length} memories`,
          memoryIds: relatedMemories.map(m => m.id)
        });
      });

    return themes.sort((a, b) => b.strength - a.strength).slice(0, 5);
  }

  // Apply decay to memory importance
  async applyMemoryDecay(agentId) {
    const memories = await database.getAgentMemories(agentId, null, 1000);
    
    for (const memory of memories) {
      const daysSinceAccess = (Date.now() - new Date(memory.accessed_at).getTime()) / (1000 * 60 * 60 * 24);
      const decayFactor = Math.pow(this.importanceDecayRate, daysSinceAccess);
      const newImportance = memory.importance * decayFactor;
      
      // Don't decay below a threshold, and never decay Overlord-related memories
      const context = JSON.parse(memory.context || '{}');
      const minImportance = context.involves_overlord ? 0.8 : 0.1;
      
      if (newImportance < minImportance && !context.permanent) {
        // Could archive or delete very low importance memories
        continue;
      }
      
      // Update importance in database
      await database.db.run(
        'UPDATE agent_memory SET importance = ? WHERE id = ?',
        [Math.max(newImportance, minImportance), memory.id]
      );
    }
  }

  // Create emotional memory
  async createEmotionalMemory(agentId, emotion, trigger, intensity) {
    const content = `Experienced ${emotion} (intensity: ${intensity}) triggered by: ${trigger}`;
    const context = {
      emotion,
      trigger,
      emotional_intensity: intensity,
      timestamp: new Date().toISOString()
    };

    return await this.createMemory(
      agentId,
      this.memoryTypes.EMOTIONAL,
      content,
      context
    );
  }

  // Create social memory
  async createSocialMemory(agentId, otherAgentId, interaction, outcome) {
    const content = `Interaction with ${otherAgentId}: ${interaction}. Outcome: ${outcome}`;
    const context = {
      other_agent: otherAgentId,
      interaction_type: interaction,
      outcome,
      timestamp: new Date().toISOString()
    };

    const memoryId = await this.createMemory(
      agentId,
      this.memoryTypes.SOCIAL,
      content,
      context
    );

    // Update agent relationship based on outcome
    const relationshipStrength = outcome === 'positive' ? 0.1 : -0.1;
    await this.updateAgentRelationship(agentId, otherAgentId, relationshipStrength);

    return memoryId;
  }

  // Update agent relationships
  async updateAgentRelationship(agent1Id, agent2Id, strengthDelta) {
    const relationships = await database.getAgentRelationships(agent1Id);
    const existing = relationships.find(r => 
      (r.agent1_id === agent1Id && r.agent2_id === agent2Id) ||
      (r.agent1_id === agent2Id && r.agent2_id === agent1Id)
    );

    if (existing) {
      const newStrength = Math.max(0, Math.min(1, existing.strength + strengthDelta));
      await database.updateRelationshipStrength(existing.id, newStrength);
    } else {
      await database.createAgentRelationship(
        agent1Id,
        agent2Id,
        'collaborative',
        0.5 + strengthDelta
      );
    }
  }

  // Get memory summary for an agent
  async getMemorySummary(agentId) {
    const memories = await database.getAgentMemories(agentId, null, 1000);
    
    const summary = {
      total_memories: memories.length,
      by_type: {},
      average_importance: 0,
      most_important: [],
      most_accessed: [],
      recent: []
    };

    // Count by type
    memories.forEach(memory => {
      summary.by_type[memory.memory_type] = (summary.by_type[memory.memory_type] || 0) + 1;
      summary.average_importance += memory.importance;
    });

    summary.average_importance /= memories.length || 1;

    // Sort for different categories
    summary.most_important = memories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    summary.most_accessed = memories
      .sort((a, b) => b.access_count - a.access_count)
      .slice(0, 5);

    summary.recent = memories
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    return summary;
  }
}

export default new MemoryManager();