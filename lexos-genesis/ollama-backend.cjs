const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'operational',
    version: '2.0.0',
    services: {
      ollama: 'ready',
      redis: 'ready',
      qdrant: 'ready'
    }
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@localhost' && password === 'admin123') {
    res.json({
      success: true,
      user: { email, role: 'admin' },
      token: 'dummy-jwt-token',
      expiresIn: 86400
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Models endpoint
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get('http://localhost:11434/api/tags');
    const models = response.data.models || [];
    res.json({
      models: models.map(m => ({
        id: m.name,
        name: m.name,
        provider: 'ollama',
        description: `${m.name} - Size: ${(m.size / 1e9).toFixed(1)}GB`,
        capabilities: ['text-generation', 'chat'],
        isLocal: true
      }))
    });
  } catch (error) {
    res.json({
      models: [
        {
          id: 'llama3:latest',
          name: 'Llama 3',
          provider: 'ollama',
          description: 'Meta Llama 3 - Latest',
          capabilities: ['text-generation', 'chat'],
          isLocal: true
        }
      ]
    });
  }
});

// Chat completion endpoint - Ollama integration
app.post('/api/chat/completions', async (req, res) => {
  try {
    const { messages, model = 'llama3:latest', stream = false } = req.body;
    
    // Convert to Ollama format
    const prompt = messages.map(m => {
      if (m.role === 'system') return `System: ${m.content}`;
      if (m.role === 'user') return `User: ${m.content}`;
      if (m.role === 'assistant') return `Assistant: ${m.content}`;
      return m.content;
    }).join('\n') + '\nAssistant: ';

    const response = await axios.post('http://localhost:11434/api/generate', {
      model: model,
      prompt: prompt,
      stream: false
    });

    res.json({
      id: 'chat-' + Date.now(),
      object: 'chat.completion',
      created: Date.now(),
      model: model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: response.data.response
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: prompt.length,
        completion_tokens: response.data.response.length,
        total_tokens: prompt.length + response.data.response.length
      }
    });
  } catch (error) {
    console.error('Ollama error:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate response',
      details: error.message 
    });
  }
});

// Agents endpoint
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      { 
        id: '1', 
        name: 'Research Agent', 
        status: 'active',
        model: 'llama3:latest',
        description: 'Specialized in research and analysis'
      },
      { 
        id: '2', 
        name: 'Code Agent', 
        status: 'active',
        model: 'codellama:latest',
        description: 'Specialized in coding tasks'
      }
    ]
  });
});

// User profile
app.get('/api/users/profile', (req, res) => {
  res.json({
    id: '1',
    email: 'admin@localhost',
    name: 'Admin User',
    role: 'admin',
    preferences: {
      theme: 'dark',
      defaultModel: 'llama3:latest'
    }
  });
});

// WebSocket endpoint placeholder
app.get('/ws', (req, res) => {
  res.status(426).send('Please use WebSocket protocol');
});

// Catch all API routes
app.all('/api/*', (req, res) => {
  console.log('Unhandled API route:', req.method, req.path);
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`LexOS Backend running on port ${PORT}`);
  console.log(`Ollama integration active at http://localhost:11434`);
});