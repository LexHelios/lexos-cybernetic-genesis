const http = require('http');
const url = require('url');
const querystring = require('querystring');

const PORT = process.env.PORT || 9001;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Mock data
const users = {
  'admin@localhost': { 
    id: '1', 
    email: 'admin@localhost', 
    password: 'admin123', 
    role: 'admin',
    name: 'Admin User',
    twoFactorEnabled: false
  }
};

const agents = [
  { id: '1', name: 'Research Agent', status: 'active', model: 'llama3:latest', description: 'Specialized in research' },
  { id: '2', name: 'Code Agent', status: 'active', model: 'codellama:latest', description: 'Specialized in coding' },
  { id: '3', name: 'Analysis Agent', status: 'active', model: 'mistral:latest', description: 'Data analysis expert' }
];

let configuration = {
  systemName: 'LexOS Genesis',
  aiProvider: 'ollama',
  defaultModel: 'llama3:latest',
  accessLevels: [
    { id: '1', name: 'Admin', permissions: ['all'] },
    { id: '2', name: 'User', permissions: ['read', 'chat'] }
  ],
  familyMembers: [],
  securitySettings: [
    { id: '1', name: 'Enable 2FA', value: false },
    { id: '2', name: 'Session Timeout', value: '24h' }
  ]
};

// Helper to parse JSON body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Route handlers
const routes = {
  // Health check
  'GET /health': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  },
  
  // System status
  'GET /api/system/status': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      status: 'operational',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services: {
        ollama: { status: 'active', models: ['llama3', 'mistral', 'codellama'] },
        redis: { status: 'active' },
        qdrant: { status: 'active' }
      },
      version: '2.0.0'
    }));
  },
  
  // Chat stats
  'GET /api/chat/auto/stats': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      totalChats: 142,
      activeUsers: 3,
      averageResponseTime: 1.2,
      successRate: 98.5,
      modelUsage: {
        'llama3:latest': 85,
        'mistral:latest': 32,
        'codellama:latest': 25
      }
    }));
  },
  
  // Agents
  'GET /api/agents': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ agents }));
  },
  
  // Configuration
  'GET /api/configuration': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(configuration));
  },
  
  // Knowledge graph
  'GET /api/knowledge/graph': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      nodes: [
        { id: '1', label: 'AI Models', type: 'category', x: 0, y: 0 },
        { id: '2', label: 'Llama 3', type: 'model', x: 100, y: 0 },
        { id: '3', label: 'Mistral', type: 'model', x: -100, y: 0 }
      ],
      edges: [
        { source: '1', target: '2' },
        { source: '1', target: '3' }
      ]
    }));
  },
  
  // Analytics
  'GET /analytics/dashboard': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      totalUsers: 3,
      activeAgents: agents.length,
      totalConversations: 142,
      averageResponseTime: 1.2,
      systemUptime: process.uptime(),
      dailyStats: {
        conversations: [20, 25, 30, 22, 28, 35, 40],
        responseTime: [1.1, 1.2, 1.0, 1.3, 1.2, 1.1, 1.2]
      }
    }));
  },
  
  // Models endpoint for Ollama
  'GET /api/models': (req, res) => {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      models: [
        {
          id: 'llama3:latest',
          name: 'Llama 3',
          provider: 'ollama',
          description: 'Meta Llama 3 - 8B parameters',
          capabilities: ['text-generation', 'chat', 'analysis'],
          isLocal: true,
          status: 'ready'
        },
        {
          id: 'mistral:latest',
          name: 'Mistral 7B',
          provider: 'ollama',
          description: 'Mistral AI - 7B parameters',
          capabilities: ['text-generation', 'chat', 'code'],
          isLocal: true,
          status: 'ready'
        },
        {
          id: 'codellama:latest',
          name: 'Code Llama',
          provider: 'ollama',
          description: 'Meta Code Llama - Specialized for code',
          capabilities: ['code-generation', 'debugging', 'explanation'],
          isLocal: true,
          status: 'ready'
        }
      ]
    }));
  },
  
  // User profile endpoint
  'GET /api/users/profile': (req, res) => {
    const user = users['admin@localhost'];
    const { password, ...userProfile } = user;
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      ...userProfile,
      preferences: {
        theme: 'dark',
        language: 'en',
        notifications: true,
        defaultModel: 'llama3:latest'
      },
      stats: {
        totalChats: 42,
        tokensUsed: 125000,
        lastActive: new Date().toISOString()
      }
    }));
  }
};

// Ollama proxy handler
async function handleOllamaProxy(req, res, path) {
  const ollamaPath = path.replace('/api/ollama', '');
  const options = {
    hostname: 'localhost',
    port: 11434,
    path: ollamaPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, corsHeaders);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (e) => {
    res.writeHead(503, corsHeaders);
    res.end(JSON.stringify({ error: 'Ollama service unavailable' }));
  });

  if (req.method !== 'GET') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// Auth handlers
async function handleAuth(req, res, path, body) {
  switch(path) {
    case '/api/auth/login':
      const { email, password } = body;
      const user = users[email];
      if (user && user.password === password) {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          user: { id: user.id, email: user.email, role: user.role, name: user.name },
          token: 'dummy-jwt-token-' + Date.now(),
          expiresIn: 86400
        }));
      } else {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
      break;
      
    case '/api/auth/logout':
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
      break;
      
    case '/api/auth/verify':
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ valid: true, user: users['admin@localhost'] }));
      break;
      
    case '/api/auth/me':
      const currentUser = users['admin@localhost'];
      if (currentUser) {
        const { password, ...userWithoutPassword } = currentUser;
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(userWithoutPassword));
      } else {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Not authenticated' }));
      }
      break;
      
    default:
      res.writeHead(404, corsHeaders);
      res.end(JSON.stringify({ error: 'Auth endpoint not found' }));
  }
}

// Chat handler
async function handleChat(req, res, body) {
  const { messages = [], model = 'llama3:latest' } = body;
  
  // Build prompt from messages
  const prompt = messages.map(m => {
    if (m.role === 'system') return `System: ${m.content}`;
    if (m.role === 'user') return `User: ${m.content}`;
    if (m.role === 'assistant') return `Assistant: ${m.content}`;
    return m.content;
  }).join('\n') + '\nAssistant: ';
  
  // Call Ollama
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
              content: response.response || 'I understand. How can I help you today?'
            },
            finish_reason: 'stop'
          }],
          usage: {
            prompt_tokens: prompt.length,
            completion_tokens: response.response ? response.response.length : 50,
            total_tokens: prompt.length + (response.response ? response.response.length : 50)
          }
        }));
      } catch (e) {
        // Fallback response
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
              content: 'I understand your request. As an AI assistant powered by ' + model + ', I\'m here to help you with any questions or tasks.'
            },
            finish_reason: 'stop'
          }]
        }));
      }
    });
  });
  
  ollamaReq.on('error', (e) => {
    // Offline mode response
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
          content: 'I\'m currently in offline mode but still ready to assist. Please ensure the Ollama service is running for full AI capabilities.'
        },
        finish_reason: 'stop'
      }]
    }));
  });
  
  ollamaReq.write(postData);
  ollamaReq.end();
}

// Main server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // Build route key
  const routeKey = `${method} ${path}`;
  
  // Check static routes first
  if (routes[routeKey]) {
    routes[routeKey](req, res);
    return;
  }
  
  // Parse body for POST/PUT requests
  const body = (method === 'POST' || method === 'PUT') ? await parseBody(req) : {};
  
  // Handle dynamic routes
  if (path.startsWith('/api/auth/')) {
    await handleAuth(req, res, path, body);
  } else if (path === '/api/chat' && method === 'POST') {
    await handleChat(req, res, body);
  } else if (path.startsWith('/api/ollama/')) {
    await handleOllamaProxy(req, res, path);
  } else if (path.startsWith('/api/agents/') && path.endsWith('/tasks') && method === 'POST') {
    // Agent task submission
    const agentId = path.split('/')[3];
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      taskId: 'task-' + Date.now(),
      agentId: agentId,
      status: 'processing',
      message: 'Task submitted successfully'
    }));
  } else if (path === '/api/configuration' && method === 'POST') {
    // Update configuration
    configuration = { ...configuration, ...body };
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, configuration }));
  } else if (path.startsWith('/api/')) {
    // Unknown API endpoint
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Endpoint not found: ' + path }));
  } else {
    // Non-API routes
    res.writeHead(404, corsHeaders);
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`LexOS Full Backend running on port ${PORT}`);
  console.log(`Ready to handle all frontend API requests`);
});