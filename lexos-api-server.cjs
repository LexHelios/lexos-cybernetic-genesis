const http = require('http');
const PORT = process.env.PORT || 9000;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Mock data
const models = [
  { id: 'llama3:latest', name: 'Llama 3', provider: 'ollama', status: 'ready' },
  { id: 'mistral:latest', name: 'Mistral', provider: 'ollama', status: 'ready' },
  { id: 'codellama:latest', name: 'Code Llama', provider: 'ollama', status: 'ready' },
  { id: 'gemma:latest', name: 'Gemma', provider: 'ollama', status: 'ready' },
  { id: 'phi:latest', name: 'Phi', provider: 'ollama', status: 'ready' }
];

const agents = [
  { id: '1', name: 'Research Agent', status: 'active', model: 'llama3:latest', description: 'Specialized in research and analysis' },
  { id: '2', name: 'Code Agent', status: 'active', model: 'codellama:latest', description: 'Expert in coding tasks' },
  { id: '3', name: 'Network Reconnaissance', status: 'active', model: 'mistral:latest', description: 'Network analysis and monitoring' },
  { id: '4', name: 'Task Executor', status: 'active', model: 'llama3:latest', description: 'General task automation' },
  { id: '5', name: 'R1 Unrestricted', status: 'active', model: 'gemma:latest', description: 'Advanced reasoning agent' },
  { id: '6', name: 'Consciousness Engine', status: 'active', model: 'phi:latest', description: 'Self-aware AI system' }
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
  
  console.log(`${method} ${url}`);
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  
  try {
    // Health check
    if (url === '/health' || url === '/api/health') {
      sendJSON(res, 200, { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'LexOS Genesis API'
      });
      return;
    }
    
    // System status
    if (url === '/api/system/status') {
      sendJSON(res, 200, {
        status: 'operational',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        services: {
          ollama: { status: 'active', models: models.length },
          redis: { status: 'active', connected: true },
          qdrant: { status: 'active', collections: 3 },
          localai: { status: 'active', endpoints: 2 }
        },
        metrics: {
          totalRequests: 1542,
          activeConnections: 7,
          avgResponseTime: 0.85
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
          'codellama:latest': 25,
          'gemma:latest': 12,
          'phi:latest': 8
        },
        recentActivity: {
          lastHour: 23,
          lastDay: 142,
          lastWeek: 856
        }
      });
      return;
    }
    
    // Models
    if (url === '/api/models' || url === '/api/models/') {
      sendJSON(res, 200, { 
        models: models,
        count: models.length,
        providers: ['ollama']
      });
      return;
    }
    
    // Agents
    if (url === '/api/agents' || url === '/api/agents/') {
      sendJSON(res, 200, { 
        agents: agents,
        count: agents.length,
        activeCount: agents.filter(a => a.status === 'active').length
      });
      return;
    }
    
    // Configuration
    if (url === '/api/configuration' || url === '/api/config') {
      sendJSON(res, 200, {
        systemName: 'LexOS Genesis',
        version: '2.0.0-alpha',
        aiProvider: 'ollama',
        defaultModel: 'llama3:latest',
        features: {
          chat: true,
          agents: true,
          voice: true,
          knowledge: true,
          analytics: true
        },
        limits: {
          maxTokens: 4096,
          maxConversations: 100,
          maxAgents: 10
        },
        accessLevels: ['admin', 'user', 'guest'],
        familyMembers: [],
        securitySettings: {
          encryption: 'AES-256',
          authentication: 'JWT',
          rateLimit: true
        }
      });
      return;
    }
    
    // Knowledge graph
    if (url === '/api/knowledge/graph') {
      sendJSON(res, 200, {
        nodes: [
          { id: '1', label: 'AI Models', type: 'category', weight: 10 },
          { id: '2', label: 'Llama 3', type: 'model', weight: 8 },
          { id: '3', label: 'Mistral', type: 'model', weight: 7 },
          { id: '4', label: 'Code Llama', type: 'model', weight: 7 },
          { id: '5', label: 'Agents', type: 'category', weight: 10 },
          { id: '6', label: 'Research Agent', type: 'agent', weight: 6 },
          { id: '7', label: 'Code Agent', type: 'agent', weight: 6 }
        ],
        edges: [
          { source: '1', target: '2', weight: 5 },
          { source: '1', target: '3', weight: 5 },
          { source: '1', target: '4', weight: 5 },
          { source: '5', target: '6', weight: 5 },
          { source: '5', target: '7', weight: 5 },
          { source: '6', target: '2', weight: 3 },
          { source: '7', target: '4', weight: 3 }
        ],
        metadata: {
          totalNodes: 7,
          totalEdges: 7,
          lastUpdated: new Date().toISOString()
        }
      });
      return;
    }
    
    // Analytics dashboard
    if (url === '/analytics/dashboard' || url === '/api/analytics/dashboard') {
      sendJSON(res, 200, {
        totalUsers: 3,
        activeAgents: agents.filter(a => a.status === 'active').length,
        totalConversations: 142,
        averageResponseTime: 1.2,
        systemUptime: process.uptime(),
        dailyStats: {
          conversations: [20, 25, 30, 22, 28, 35, 40],
          responseTime: [1.1, 1.2, 1.0, 1.3, 1.2, 1.1, 1.2],
          errors: [0, 1, 0, 2, 0, 0, 1],
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        systemHealth: {
          cpu: 45,
          memory: 62,
          disk: 78,
          network: 'stable'
        }
      });
      return;
    }
    
    // User profile
    if (url === '/api/users/profile' || url === '/api/auth/me' || url === '/api/user') {
      sendJSON(res, 200, {
        id: '1',
        email: 'admin@lexcommand.ai',
        name: 'Admin User',
        role: 'admin',
        avatar: null,
        preferences: {
          theme: 'dark',
          language: 'en',
          notifications: true
        },
        createdAt: '2024-01-01T00:00:00Z',
        lastLogin: new Date().toISOString()
      });
      return;
    }
    
    // Auth endpoints
    if (url === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      sendJSON(res, 200, {
        success: true,
        user: { 
          id: '1', 
          email: body.email || 'admin@lexcommand.ai', 
          role: 'admin',
          name: 'Admin User'
        },
        token: 'jwt-token-' + Date.now(),
        expiresIn: 86400,
        refreshToken: 'refresh-' + Date.now()
      });
      return;
    }
    
    if (url === '/api/auth/verify' || url === '/api/auth/validate') {
      sendJSON(res, 200, { 
        valid: true,
        user: {
          id: '1',
          email: 'admin@lexcommand.ai',
          role: 'admin'
        }
      });
      return;
    }
    
    // Chat endpoint
    if (url === '/api/chat' && method === 'POST') {
      const body = await parseBody(req);
      const userMessage = body.messages?.[body.messages.length - 1]?.content || 'Hello';
      
      // Simulate AI response
      sendJSON(res, 200, {
        id: 'chat-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: body.model || 'llama3:latest',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: `I understand you said: "${userMessage}". I'm LexOS Genesis AI, powered by open-source models. How can I assist you today?`
          },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 25,
          total_tokens: 35
        }
      });
      return;
    }
    
    // Voice command endpoint
    if (url === '/api/voice/command' && method === 'POST') {
      sendJSON(res, 200, {
        success: true,
        command: 'Voice command received',
        response: 'Processing your voice command',
        action: {
          type: 'response',
          text: 'I heard your voice command and I\'m ready to help!'
        }
      });
      return;
    }
    
    // Notifications
    if (url === '/api/notifications') {
      sendJSON(res, 200, {
        notifications: [
          {
            id: '1',
            type: 'info',
            title: 'System Update',
            message: 'LexOS Genesis is running smoothly',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            read: false
          },
          {
            id: '2',
            type: 'success',
            title: 'Models Loaded',
            message: 'All AI models are ready',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
            read: true
          }
        ],
        unreadCount: 1
      });
      return;
    }
    
    // Messages/Chat history
    if (url === '/api/messages' || url === '/api/conversations') {
      sendJSON(res, 200, {
        conversations: [
          {
            id: '1',
            title: 'General Chat',
            lastMessage: 'How can I help you?',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            unread: 0
          }
        ],
        total: 1
      });
      return;
    }
    
    // Default 404 for unmatched routes
    sendJSON(res, 404, { 
      error: 'Endpoint not found',
      path: url,
      method: method,
      suggestion: 'Check API documentation'
    });
    
  } catch (error) {
    console.error('Server error:', error);
    sendJSON(res, 500, { 
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start server - bind to all interfaces (0.0.0.0)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`LexOS Genesis API Server running on http://0.0.0.0:${PORT}`);
  console.log('Ready to handle all API requests!');
  console.log('Endpoints available:');
  console.log('  - /health');
  console.log('  - /api/system/status');
  console.log('  - /api/chat/auto/stats');
  console.log('  - /api/models');
  console.log('  - /api/agents');
  console.log('  - /api/configuration');
  console.log('  - /api/knowledge/graph');
  console.log('  - /api/analytics/dashboard');
  console.log('  - /api/auth/login (POST)');
  console.log('  - /api/chat (POST)');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});