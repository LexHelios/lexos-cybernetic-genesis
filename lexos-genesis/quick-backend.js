const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 9001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
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

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@localhost' && password === 'admin123') {
    res.json({
      success: true,
      user: { email, role: 'admin' },
      token: 'dummy-jwt-token'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/agents', (req, res) => {
  res.json([
    { id: 1, name: 'Research Agent', status: 'active' },
    { id: 2, name: 'Code Agent', status: 'active' }
  ]);
});

// Catch all API routes
app.all('/api/*', (req, res) => {
  res.json({ message: 'API endpoint ready' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});