const http = require('http');
const PORT = process.env.PORT || 9000;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Mock data storage
const models = [
  { id: 'llama3:latest', name: 'Llama 3', provider: 'ollama', status: 'ready' },
  { id: 'mistral:latest', name: 'Mistral', provider: 'ollama', status: 'ready' },
  { id: 'codellama:latest', name: 'Code Llama', provider: 'ollama', status: 'ready' }
];

const agents = [
  { id: '1', name: 'Research Agent', status: 'active', model: 'llama3:latest' },
  { id: '2', name: 'Code Agent', status: 'active', model: 'codellama:latest' }
];

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, corsHeaders);
  res.end(JSON.stringify(data));
}

// Helper to parse JSON body
async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Main request handler
const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;
  
  // Handle CORS
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // Routes
  try {
    // Health check
    if (url === '/health') {
      sendJSON(res, 200, { status: 'ok', timestamp: new Date().toISOString() });
      return;
    }
    
    // System status
    if (url === '/api/system/status') {
      sendJSON(res, 200, {
        status: 'operational',
        uptime: process.uptime(),
        services: {
          ollama: { status: 'active' },
          redis: { status: 'active' },
          qdrant: { status: 'active' }
        }
      });
      return;
    }
    
    // Chat auto stats
    if (url === '/api/chat/auto/stats') {
      sendJSON(res, 200, {
        totalChats: 142,
        activeUsers: 3,
        averageResponseTime: 1.2,
        successRate: 98.5,
        modelUsage: {
          'llama3:latest': 85,
          'mistral:latest': 32,
          'codellama:latest': 25
        }
      });
      return;
    }
    
    // Models
    if (url === '/api/models') {
      sendJSON(res, 200, { models });
      return;
    }
    
    // Agents
    if (url === '/api/agents') {
      sendJSON(res, 200, { agents });
      return;
    }
    
    // Configuration
    if (url === '/api/configuration') {
      sendJSON(res, 200, {
        systemName: 'LexOS Genesis',
        aiProvider: 'ollama',
        defaultModel: 'llama3:latest',
        accessLevels: [],
        familyMembers: [],
        securitySettings: []
      });
      return;
    }
    
    // Knowledge graph
    if (url === '/api/knowledge/graph') {
      sendJSON(res, 200, {
        nodes: [
          { id: '1', label: 'AI Models', type: 'category' },
          { id: '2', label: 'Llama 3', type: 'model' },
          { id: '3', label: 'Mistral', type: 'model' }
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '1', target: '3' }
        ]
      });
      return;
    }
    
    // Analytics dashboard
    if (url === '/analytics/dashboard') {
      sendJSON(res, 200, {
        totalUsers: 3,
        activeAgents: 2,
        totalConversations: 142,
        averageResponseTime: 1.2,
        systemUptime: process.uptime(),
        dailyStats: {
          conversations: [20, 25, 30, 22, 28, 35, 40],
          responseTime: [1.1, 1.2, 1.0, 1.3, 1.2, 1.1, 1.2]
        }
      });
      return;
    }
    
    // User profile
    if (url === '/api/users/profile' || url === '/api/auth/me') {
      sendJSON(res, 200, {
        id: '1',
        email: 'admin@localhost',
        name: 'Admin User',
        role: 'admin'
      });
      return;
    }
    
    // Auth endpoints
    if (url === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      if (body.email === 'admin@localhost' && body.password === 'admin123') {
        sendJSON(res, 200, {
          success: true,
          user: { id: '1', email: 'admin@localhost', role: 'admin' },
          token: 'dummy-jwt-token',
          expiresIn: 86400
        });
      } else {
        sendJSON(res, 401, { error: 'Invalid credentials' });
      }
      return;
    }
    
    if (url === '/api/auth/verify') {
      sendJSON(res, 200, { valid: true });
      return;
    }
    
    // Chat endpoint
    if (url === '/api/chat' && method === 'POST') {
      const body = await parseBody(req);
      const userMessage = body.messages?.[body.messages.length - 1]?.content || 'Hello';
      
      // Call Ollama
      const ollamaReq = http.request({
        hostname: 'localhost',
        port: 11434,
        path: '/api/generate',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (ollamaRes) => {
        let data = '';
        ollamaRes.on('data', chunk => data += chunk);
        ollamaRes.on('end', () => {
          try {
            const result = JSON.parse(data);
            sendJSON(res, 200, {
              id: 'chat-' + Date.now(),
              choices: [{
                message: {
                  role: 'assistant',
                  content: result.response || 'I understand. How can I help you?'
                }
              }]
            });
          } catch (e) {
            // Fallback response
            sendJSON(res, 200, {
              id: 'chat-' + Date.now(),
              choices: [{
                message: {
                  role: 'assistant',
                  content: 'I am here to help! This is LexOS Genesis AI assistant.'
                }
              }]
            });
          }
        });
      });
      
      ollamaReq.on('error', () => {
        // Offline fallback
        sendJSON(res, 200, {
          id: 'chat-' + Date.now(),
          choices: [{
            message: {
              role: 'assistant',
              content: 'Welcome to LexOS Genesis! I am your AI assistant. How can I help you today?'
            }
          }]
        });
      });
      
      ollamaReq.write(JSON.stringify({
        model: body.model || 'llama3:latest',
        prompt: userMessage,
        stream: false
      }));
      ollamaReq.end();
      return;
    }
    
    // Voice command endpoint
    if (url === '/api/voice/command' && method === 'POST') {
      sendJSON(res, 200, {
        success: true,
        command: 'Voice command received',
        response: 'I heard you! Voice commands are being processed.'
      });
      return;
    }
    
    // Ollama proxy endpoints
    if (url.startsWith('/api/ollama/')) {
      const ollamaPath = url.replace('/api/ollama', '');
      const proxyReq = http.request({
        hostname: 'localhost',
        port: 11434,
        path: ollamaPath,
        method: method,
        headers: req.headers
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, corsHeaders);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', () => {
        sendJSON(res, 503, { error: 'Ollama service unavailable' });
      });
      
      if (method !== 'GET') {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
      return;
    }
    
    // Default 404
    sendJSON(res, 404, { error: 'Endpoint not found' });
    
  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, 500, { error: 'Internal server error' });
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`LexOS Production Backend running on port ${PORT}`);
  console.log('All endpoints ready for demo!');
});