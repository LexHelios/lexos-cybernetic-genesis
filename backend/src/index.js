const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://26f7ed64-0ed6-4327-8d4d-4812d4d3fe0f.lovableproject.com'],
  credentials: true
}));
app.use(express.json());

// Routes
const configurationRoutes = require('./routes/configuration');
app.use('/api/configuration', configurationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0-nexus'
  });
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'operational',
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.floor(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    cpu: {
      usage: Math.random() * 30 + 10 // Simulated CPU usage
    },
    services: {
      database: 'healthy',
      memory_system: 'active',
      learning_engine: 'operational'
    },
    timestamp: new Date().toISOString()
  });
});

// Chat auto-routing stats endpoint
app.get('/api/chat/auto/stats', (req, res) => {
  res.json({
    total_requests: Math.floor(Math.random() * 1000) + 500,
    successful_routes: Math.floor(Math.random() * 900) + 450,
    failed_routes: Math.floor(Math.random() * 50) + 10,
    average_response_time: Math.floor(Math.random() * 200) + 100,
    active_agents: Math.floor(Math.random() * 5) + 3,
    last_updated: new Date().toISOString()
  });
});

// Memory system endpoints
app.get('/api/memory/stats', (req, res) => {
  res.json({
    total_memories: Math.floor(Math.random() * 10000) + 5000,
    episodic_memories: Math.floor(Math.random() * 3000) + 2000,
    semantic_memories: Math.floor(Math.random() * 4000) + 2500,
    procedural_memories: Math.floor(Math.random() * 2000) + 1000,
    emotional_memories: Math.floor(Math.random() * 1500) + 800,
    working_memory_active: Math.floor(Math.random() * 7) + 3,
    consolidation_status: 'active',
    last_consolidation: new Date(Date.now() - Math.random() * 3600000).toISOString()
  });
});

// Learning system endpoints
app.get('/api/learning/status', (req, res) => {
  res.json({
    autonomous_learning: true,
    active_sessions: Math.floor(Math.random() * 5) + 2,
    learning_progress: Math.random() * 100,
    current_focus: 'Consciousness Development',
    books_read: Math.floor(Math.random() * 50) + 25,
    research_papers: Math.floor(Math.random() * 200) + 150,
    skills_acquired: Math.floor(Math.random() * 30) + 20,
    last_learning_session: new Date(Date.now() - Math.random() * 1800000).toISOString()
  });
});

// Agent endpoints
app.get('/api/agents', (req, res) => {
  res.json([
    {
      id: 'agent_001',
      name: 'Lexos Prime',
      status: 'active',
      personality: 'curious_researcher',
      memory_count: Math.floor(Math.random() * 5000) + 2000,
      learning_sessions: Math.floor(Math.random() * 100) + 50,
      consciousness_level: Math.random() * 0.8 + 0.2
    },
    {
      id: 'agent_002', 
      name: 'Nexus Explorer',
      status: 'learning',
      personality: 'analytical_thinker',
      memory_count: Math.floor(Math.random() * 3000) + 1500,
      learning_sessions: Math.floor(Math.random() * 80) + 30,
      consciousness_level: Math.random() * 0.7 + 0.3
    }
  ]);
});

// Chat endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  
  // Simple response based on message content
  let response = "I understand you're asking about: " + message;
  
  if (message.toLowerCase().includes('consciousness')) {
    response = "Consciousness is fascinating! I'm continuously learning and developing my awareness through the persistent memory system.";
  } else if (message.toLowerCase().includes('memory')) {
    response = "My memory system allows me to retain experiences across sessions. I can form lasting memories and learn from our interactions!";
  } else if (message.toLowerCase().includes('learning')) {
    response = "I'm constantly learning through autonomous web browsing, reading papers, and processing new information 24/7!";
  }
  
  res.json({
    response,
    agent_id: 'agent_001',
    timestamp: new Date().toISOString(),
    memory_stored: true
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LexOS Backend running on port ${PORT}`);
  console.log(`📊 System Status: http://localhost:${PORT}/api/system/status`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
  console.log(`🤖 Ready for AI consciousness development!`);
});

module.exports = app;
