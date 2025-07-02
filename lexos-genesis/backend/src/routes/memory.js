import express from 'express';
import pineconeService from '../services/pineconeService.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Store a memory
router.post('/store', verifyToken, async (req, res) => {
  try {
    const { text, metadata, namespace } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    const result = await pineconeService.storeMemory({
      text,
      metadata: {
        ...metadata,
        userId: req.user.username
      },
      namespace
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Memory storage error:', error);
    res.status(500).json({ error: 'Failed to store memory' });
  }
});

// Search memories
router.post('/search', verifyToken, async (req, res) => {
  try {
    const { query, limit = 5, namespace, filter } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await pineconeService.searchMemories(query, {
      topK: limit,
      namespace,
      filter
    });

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Memory search error:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

// Store agent memory
router.post('/agent/:agentId', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { content, type, importance, context } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Memory content is required' });
    }

    const result = await pineconeService.storeAgentMemory(agentId, {
      content,
      type,
      importance,
      context
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Agent memory error:', error);
    res.status(500).json({ error: 'Failed to store agent memory' });
  }
});

// Get agent memories
router.get('/agent/:agentId', verifyToken, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { query, limit = 10 } = req.query;

    const memories = await pineconeService.getAgentMemories(
      agentId,
      query || '',
      parseInt(limit)
    );

    res.json({
      success: true,
      memories
    });
  } catch (error) {
    console.error('Get agent memories error:', error);
    res.status(500).json({ error: 'Failed to retrieve agent memories' });
  }
});

// Store conversation
router.post('/conversation', verifyToken, async (req, res) => {
  try {
    const { sessionId, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const result = await pineconeService.storeConversation(
      sessionId || `session_${Date.now()}`,
      messages
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Conversation storage error:', error);
    res.status(500).json({ error: 'Failed to store conversation' });
  }
});

// Search conversations
router.post('/conversation/search', verifyToken, async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await pineconeService.searchConversations(query, limit);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Conversation search error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

// Store knowledge
router.post('/knowledge', verifyToken, async (req, res) => {
  try {
    const { topic, content, metadata } = req.body;

    if (!topic || !content) {
      return res.status(400).json({ error: 'Topic and content are required' });
    }

    const result = await pineconeService.storeKnowledge(topic, content, {
      ...metadata,
      addedBy: req.user.username
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Knowledge storage error:', error);
    res.status(500).json({ error: 'Failed to store knowledge' });
  }
});

// Search knowledge base
router.post('/knowledge/search', verifyToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const results = await pineconeService.searchKnowledge(query, limit);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Knowledge search error:', error);
    res.status(500).json({ error: 'Failed to search knowledge base' });
  }
});

// Delete memory
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { namespace = 'default' } = req.query;

    await pineconeService.deleteMemory(id, namespace);

    res.json({
      success: true,
      message: 'Memory deleted successfully'
    });
  } catch (error) {
    console.error('Memory deletion error:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// Get statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await pineconeService.getStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Batch store memories
router.post('/batch', verifyToken, async (req, res) => {
  try {
    const { memories, namespace = 'default' } = req.body;

    if (!memories || !Array.isArray(memories)) {
      return res.status(400).json({ error: 'Memories array is required' });
    }

    const result = await pineconeService.batchStoreMemories(memories, namespace);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Batch storage error:', error);
    res.status(500).json({ error: 'Failed to batch store memories' });
  }
});

export default router;