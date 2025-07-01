import express from 'express';
import { OllamaService } from '../services/ollamaService.js';
import database from '../services/database.js';

const router = express.Router();
const ollamaService = new OllamaService();

// List available models
router.get('/models', async (req, res) => {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    
    const models = data.models.map(model => ({
      name: model.name,
      size: model.size,
      modified: model.modified_at,
      available: true
    }));
    
    res.json({
      success: true,
      models,
      count: models.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Chat completion endpoint
router.post('/completions', async (req, res) => {
  try {
    const { message, model, temperature, max_tokens, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Use DeepSeek R1 as default if no model specified
    const selectedModel = model || 'deepseek-r1:latest';
    
    // Generate completion
    const result = await ollamaService.generateCompletion(message, {
      model: selectedModel,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 1000
    });
    
    // Log the interaction
    await database.logSystemEvent(
      'chat',
      'info',
      'ChatAPI',
      `Generated completion with ${selectedModel}`,
      { sessionId, messageLength: message.length }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Chat completion error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Streaming chat endpoint
router.post('/stream', async (req, res) => {
  try {
    const { message, model, temperature } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const selectedModel = model || 'deepseek-r1:latest';
    
    // Make streaming request to Ollama
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel,
        prompt: message,
        stream: true,
        options: {
          temperature: temperature || 0.7
        }
      })
    });
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

export default router;