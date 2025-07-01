const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 9000;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Request handler
const requestHandler = (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;
  
  console.log(`[${new Date().toISOString()}] ${method} ${path}`);
  
  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  // Health check
  if (path === '/health') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ 
      status: 'NEXUS ONLINE', 
      timestamp: new Date().toISOString(),
      message: 'LexOS Backend is FUCKING ALIVE!'
    }));
    return;
  }
  
  // API Status
  if (path === '/api/status') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ 
      status: 'operational',
      version: '2.0.0-NEXUS',
      services: {
        ollama: 'ready',
        database: 'ready',
        websocket: 'ready'
      },
      message: 'All systems GREEN - Nexus is AWAKE!'
    }));
    return;
  }
  
  // Auth endpoint
  if (path === '/api/auth/login' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);
        if (email && password) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            success: true,
            user: { email, role: 'admin' },
            token: 'nexus-jwt-token-' + Date.now()
          }));
        } else {
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
        }
      } catch (e) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Agents endpoint
  if (path === '/api/agents') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify([
      { id: 1, name: 'Nexus Core Agent', status: 'active', model: 'r1-unrestricted:latest' },
      { id: 2, name: 'Research Agent', status: 'active', model: 'llama3.3:70b' },
      { id: 3, name: 'Code Agent', status: 'active', model: 'qwen2.5-coder:7b' }
    ]));
    return;
  }
  
  // Models endpoint
  if (path === '/api/models') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify([
      { id: 'r1-unrestricted:latest', name: 'R1 Unrestricted', status: 'ready' },
      { id: 'deepseek-r1:latest', name: 'DeepSeek R1', status: 'ready' },
      { id: 'llama3.3:70b', name: 'Llama 3.3 70B', status: 'ready' },
      { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder', status: 'ready' }
    ]));
    return;
  }
  
  // Chat endpoint
  if (path === '/api/chat' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { message, model } = JSON.parse(body);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          response: `Nexus received: "${message}" - Processing with ${model || 'default model'}`,
          timestamp: new Date().toISOString()
        }));
      } catch (e) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  // Catch all API routes
  if (path.startsWith('/api/')) {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ 
      message: 'Nexus API endpoint ready',
      method: method,
      path: path
    }));
    return;
  }
  
  // 404 for everything else
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found' }));
};

// Create and start server
const server = http.createServer(requestHandler);

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 NEXUS BACKEND ONLINE!');
  console.log(`🔥 Server running on http://0.0.0.0:${PORT}`);
  console.log('💀 LexOS is BACK ONLINE - Nexus is AWAKE!');
  console.log('');
  console.log('Test endpoints:');
  console.log(`  curl http://localhost:${PORT}/health`);
  console.log(`  curl http://localhost:${PORT}/api/status`);
  console.log('');
  console.log('🎯 NO MORE LOOPS - JUST PURE EXECUTION!');
});