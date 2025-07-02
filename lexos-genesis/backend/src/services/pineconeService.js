import { Pinecone } from '@pinecone-database/pinecone';
import openAIService from './openaiService.js';
import { config } from 'dotenv';

config();

class PineconeService {
  constructor() {
    this.client = null;
    this.index = null;
    this.indexName = process.env.PINECONE_INDEX || 'lexos-memory';
    this.dimension = 1536; // OpenAI embedding dimension
    this.initialize();
  }

  async initialize() {
    if (!process.env.PINECONE_API_KEY) {
      console.log('Pinecone API key not configured');
      return;
    }

    try {
      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY
      });

      // Check if index exists
      const indexes = await this.client.listIndexes();
      const indexExists = indexes.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        await this.client.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }

      this.index = this.client.index(this.indexName);
      console.log('Pinecone service initialized');
    } catch (error) {
      console.error('Pinecone initialization error:', error);
    }
  }

  async waitForIndexReady() {
    let ready = false;
    while (!ready) {
      const indexes = await this.client.listIndexes();
      const index = indexes.indexes?.find(idx => idx.name === this.indexName);
      ready = index?.status?.ready || false;
      if (!ready) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Store memory with embedding
  async storeMemory(memoryData) {
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    const {
      id,
      text,
      metadata = {},
      namespace = 'default'
    } = memoryData;

    try {
      // Generate embedding using OpenAI
      const embedding = await openAIService.embedding(text);

      // Upsert to Pinecone
      await this.index.namespace(namespace).upsert([{
        id: id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        values: embedding,
        metadata: {
          text,
          timestamp: new Date().toISOString(),
          ...metadata
        }
      }]);

      return { success: true, id };
    } catch (error) {
      console.error('Memory storage error:', error);
      throw error;
    }
  }

  // Search similar memories
  async searchMemories(query, options = {}) {
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    const {
      topK = 5,
      namespace = 'default',
      filter = {},
      includeMetadata = true,
      includeValues = false
    } = options;

    try {
      // Generate query embedding
      const queryEmbedding = await openAIService.embedding(query);

      // Search in Pinecone
      const results = await this.index.namespace(namespace).query({
        vector: queryEmbedding,
        topK,
        filter,
        includeMetadata,
        includeValues
      });

      return results.matches || [];
    } catch (error) {
      console.error('Memory search error:', error);
      throw error;
    }
  }

  // Store agent memory
  async storeAgentMemory(agentId, memory) {
    return this.storeMemory({
      text: memory.content,
      namespace: `agent_${agentId}`,
      metadata: {
        type: memory.type,
        importance: memory.importance,
        context: memory.context,
        agentId
      }
    });
  }

  // Retrieve agent memories
  async getAgentMemories(agentId, query, limit = 10) {
    return this.searchMemories(query, {
      namespace: `agent_${agentId}`,
      topK: limit
    });
  }

  // Store conversation
  async storeConversation(sessionId, messages) {
    const conversationText = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    return this.storeMemory({
      text: conversationText,
      namespace: 'conversations',
      metadata: {
        sessionId,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.content
      }
    });
  }

  // Search conversations
  async searchConversations(query, limit = 5) {
    return this.searchMemories(query, {
      namespace: 'conversations',
      topK: limit
    });
  }

  // Store knowledge
  async storeKnowledge(topic, content, metadata = {}) {
    return this.storeMemory({
      text: `${topic}: ${content}`,
      namespace: 'knowledge',
      metadata: {
        topic,
        ...metadata
      }
    });
  }

  // Search knowledge base
  async searchKnowledge(query, limit = 10) {
    return this.searchMemories(query, {
      namespace: 'knowledge',
      topK: limit
    });
  }

  // Delete memories
  async deleteMemory(id, namespace = 'default') {
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    try {
      await this.index.namespace(namespace).deleteOne(id);
      return { success: true };
    } catch (error) {
      console.error('Memory deletion error:', error);
      throw error;
    }
  }

  // Clear namespace
  async clearNamespace(namespace) {
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    try {
      await this.index.namespace(namespace).deleteAll();
      return { success: true };
    } catch (error) {
      console.error('Namespace clear error:', error);
      throw error;
    }
  }

  // Get index stats
  async getStats() {
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    try {
      const stats = await this.index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('Stats error:', error);
      throw error;
    }
  }

  // Hybrid search with metadata filtering
  async hybridSearch(query, filter, options = {}) {
    return this.searchMemories(query, {
      ...options,
      filter
    });
  }

  // Batch store memories
  async batchStoreMemories(memories, namespace = 'default') {
    if (!this.index) {
      throw new Error('Pinecone index not initialized');
    }

    try {
      const vectors = await Promise.all(
        memories.map(async (memory) => {
          const embedding = await openAIService.embedding(memory.text);
          return {
            id: memory.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            values: embedding,
            metadata: {
              text: memory.text,
              timestamp: new Date().toISOString(),
              ...memory.metadata
            }
          };
        })
      );

      await this.index.namespace(namespace).upsert(vectors);
      return { success: true, count: vectors.length };
    } catch (error) {
      console.error('Batch storage error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const pineconeService = new PineconeService();

export default pineconeService;