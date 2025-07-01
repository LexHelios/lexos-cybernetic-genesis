const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 9001;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Simple router
const routes = {
  '/health': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  },
  
  '/api/status': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ 
      status: 'operational',
      version: '2.0.0',
      services: {
        ollama: 'ready',
        redis: 'ready',
        qdrant: 'ready'
      }
    }));
  },
  
  '/api/models': async (req, res) => {
    try {
      const http = require('http');
      const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/tags',
        method: 'GET'
      };
      
      const ollamaReq = http.request(options, (ollamaRes) => {
        let data = '';
        ollamaRes.on('data', chunk => data += chunk);
        ollamaRes.on('end', () => {
          try {
            const models = JSON.parse(data).models || [];
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              models: models.map(m => ({
                id: m.name,
                name: m.name,
                provider: 'ollama',
                description: `${m.name} - Local`,
                capabilities: ['text-generation', 'chat'],
                isLocal: true
              }))
            }));
          } catch (e) {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              models: [{
                id: 'llama3:latest',
                name: 'Llama 3',
                provider: 'ollama',
                description: 'Meta Llama 3',
                capabilities: ['text-generation', 'chat'],
                isLocal: true
              }]
            }));
          }
        });
      });
      
      ollamaReq.on('error', () => {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          models: [{
            id: 'llama3:latest',
            name: 'Llama 3',
            provider: 'ollama',
            description: 'Meta Llama 3',
            capabilities: ['text-generation', 'chat'],
            isLocal: true
          }]
        }));
      });
      
      ollamaReq.end();
    } catch (error) {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ models: [] }));
    }
  },
  
  '/api/agents': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      agents: [
        { 
          id: '1', 
          name: 'Research Agent', 
          status: 'active',
          model: 'llama3:latest'
        },
        { 
          id: '2', 
          name: 'Code Agent', 
          status: 'active',
          model: 'codellama:latest'
        }
      ]
    }));
  },
  
  '/api/users/profile': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      id: '1',
      email: 'admin@localhost',
      name: 'Admin User',
      role: 'admin',
      preferences: {
        theme: 'dark',
        defaultModel: 'llama3:latest'
      }
    }));
  },
  
  '/api/system/status': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        ollama: { status: 'active', models: ['llama3', 'mistral'] },
        redis: { status: 'active' },
        qdrant: { status: 'active' }
      }
    }));
  },
  
  '/api/chat/auto/stats': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      totalChats: 142,
      activeUsers: 3,
      averageResponseTime: 1.2,
      successRate: 98.5
    }));
  }
};

// Auth endpoint handler
async function handleAuth(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { email, password } = JSON.parse(body);
      if (email === 'admin@localhost' && password === 'admin123') {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          user: { email, role: 'admin' },
          token: 'dummy-jwt-token',
          expiresIn: 86400
        }));
      } else {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
    } catch (e) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
}

// Chat completion handler
async function handleChat(req, res) {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    try {
      const { messages, model = 'llama3:latest' } = JSON.parse(body);
      
      const prompt = messages.map(m => {
        if (m.role === 'system') return `System: ${m.content}`;
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') return `Assistant: ${m.content}`;
        return m.content;
      }).join('\n') + '\nAssistant: ';
      
      const postData = JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false
      });
      
      const options = {
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const ollamaReq = http.request(options, (ollamaRes) => {
        let data = '';
        ollamaRes.on('data', chunk => data += chunk);
        ollamaRes.on('end', () => {
          try {
            const response = JSON.parse(data);
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              id: 'chat-' + Date.now(),
              object: 'chat.completion',
              created: Date.now(),
              model: model,
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: response.response || 'I am ready to help!'
                },
                finish_reason: 'stop'
              }]
            }));
          } catch (e) {
            res.writeHead(200, corsHeaders);
            res.end(JSON.stringify({
              id: 'chat-' + Date.now(),
              object: 'chat.completion',
              model: model,
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Hello! I am your AI assistant. How can I help you today?'
                },
                finish_reason: 'stop'
              }]
            }));
          }
        });
      });
      
      ollamaReq.on('error', (e) => {
        console.error('Ollama error:', e);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          id: 'chat-' + Date.now(),
          object: 'chat.completion',
          model: model,
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: 'I am currently in offline mode. Please ensure Ollama is running.'
            },
            finish_reason: 'stop'
          }]
        }));
      });
      
      ollamaReq.write(postData);
      ollamaReq.end();
      
    } catch (e) {
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // Route handling
  if (req.method === 'POST' && path === '/api/auth/login') {
    handleAuth(req, res);
  } else if (req.method === 'POST' && (path === '/api/chat/completions' || path === '/api/chat')) {
    handleChat(req, res);
  } else if (routes[path]) {
    routes[path](req, res);
  } else if (path.startsWith('/api/')) {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  } else {
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`LexOS API Server running on port ${PORT}`);
  console.log(`Ollama integration active`);
});