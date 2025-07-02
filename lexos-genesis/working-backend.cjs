const http = require('http');
const net = require('net');

const PORT = 9000;

// Test if port is available
const testPort = (port) => {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.close(() => resolve(true));
      })
      .listen(port, '127.0.0.1');
  });
};

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Mock data
const mockData = {
  models: [
    { id: 'llama3:latest', name: 'Llama 3', provider: 'ollama', status: 'ready' },
    { id: 'mistral:latest', name: 'Mistral', provider: 'ollama', status: 'ready' },
    { id: 'codellama:latest', name: 'Code Llama', provider: 'ollama', status: 'ready' }
  ],
  agents: [
    { id: '1', name: 'Research Agent', status: 'active', model: 'llama3:latest' },
    { id: '2', name: 'Code Agent', status: 'active', model: 'codellama:latest' }
  ]
};

// Request handler
const requestHandler = (req, res) => {
  const url = req.url;
  const method = req.method;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url}`);
  
  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // Add CORS to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // Routes
  switch (url) {
    case '/health':
    case '/api/health':
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      break;
      
    case '/api/system/status':
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'operational',
        uptime: process.uptime(),
        services: {
          ollama: { status: 'active' },
          redis: { status: 'active' },
          qdrant: { status: 'active' }
        }
      }));
      break;
      
    case '/api/chat/auto/stats':
      res.writeHead(200);
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
      break;
      
    case '/api/models':
    case '/api/models/':
      res.writeHead(200);
      res.end(JSON.stringify({ models: mockData.models }));
      break;
      
    case '/api/agents':
    case '/api/agents/':
      res.writeHead(200);
      res.end(JSON.stringify({ agents: mockData.agents }));
      break;
      
    case '/api/configuration':
    case '/api/config':
      res.writeHead(200);
      res.end(JSON.stringify({
        systemName: 'LexOS Genesis',
        aiProvider: 'ollama',
        defaultModel: 'llama3:latest',
        accessLevels: [],
        familyMembers: [],
        securitySettings: []
      }));
      break;
      
    case '/api/knowledge/graph':
      res.writeHead(200);
      res.end(JSON.stringify({
        nodes: [
          { id: '1', label: 'AI Models', type: 'category' },
          { id: '2', label: 'Llama 3', type: 'model' },
          { id: '3', label: 'Mistral', type: 'model' }
        ],
        edges: [
          { source: '1', target: '2' },
          { source: '1', target: '3' }
        ]
      }));
      break;
      
    case '/analytics/dashboard':
    case '/api/analytics/dashboard':
      res.writeHead(200);
      res.end(JSON.stringify({
        totalUsers: 3,
        activeAgents: 2,
        totalConversations: 142,
        averageResponseTime: 1.2,
        systemUptime: process.uptime(),
        dailyStats: {
          conversations: [20, 25, 30, 22, 28, 35, 40],
          responseTime: [1.1, 1.2, 1.0, 1.3, 1.2, 1.1, 1.2]
        }
      }));
      break;
      
    case '/api/users/profile':
    case '/api/auth/me':
    case '/api/user':
      res.writeHead(200);
      res.end(JSON.stringify({
        id: '1',
        email: 'admin@lexcommand.ai',
        name: 'Admin User',
        role: 'admin'
      }));
      break;
      
    case '/api/auth/verify':
    case '/api/auth/validate':
      res.writeHead(200);
      res.end(JSON.stringify({ valid: true }));
      break;
      
    default:
      if (url === '/api/auth/login' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            user: { id: '1', email: 'admin@lexcommand.ai', role: 'admin' },
            token: 'jwt-' + Date.now(),
            expiresIn: 86400
          }));
        });
      } else if (url === '/api/chat' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          res.writeHead(200);
          res.end(JSON.stringify({
            id: 'chat-' + Date.now(),
            choices: [{
              message: {
                role: 'assistant',
                content: 'Welcome to LexOS Genesis! I\'m your AI assistant.'
              }
            }]
          }));
        });
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
  }
};

// Start server
async function startServer() {
  const portAvailable = await testPort(PORT);
  
  if (!portAvailable) {
    console.error(`Port ${PORT} is already in use!`);
    console.log('Trying to kill existing process...');
    
    // Try to find and kill process using port 9000
    try {
      const exec = require('child_process').exec;
      exec(`lsof -t -i:${PORT} | xargs kill -9`, (err) => {
        if (!err) {
          console.log('Killed existing process');
          setTimeout(() => startServer(), 1000);
        } else {
          console.error('Failed to kill process:', err);
          process.exit(1);
        }
      });
      return;
    } catch (e) {
      console.error('Error:', e);
      process.exit(1);
    }
  }
  
  const server = http.createServer(requestHandler);
  
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Working Backend running on http://0.0.0.0:${PORT}`);
    console.log('Test with: curl http://localhost:9000/health');
  });
}

startServer();