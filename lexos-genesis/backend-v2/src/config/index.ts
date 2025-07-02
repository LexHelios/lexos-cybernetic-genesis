import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  appName: process.env.APP_NAME || 'LexOS-Backend',
  apiVersion: process.env.API_VERSION || 'v1',

  // Security
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-this',
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/lexos_db',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  },

  // Agent System
  agent: {
    heartbeatInterval: parseInt(process.env.AGENT_HEARTBEAT_INTERVAL || '30000', 10),
    timeout: parseInt(process.env.AGENT_TIMEOUT || '300000', 10),
  },

  // External Services
  services: {
    ollama: {
      apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
  },

  // Monitoring
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    port: parseInt(process.env.METRICS_PORT || '9090', 10),
  },

  // Queue
  queue: {
    redis: {
      host: process.env.QUEUE_REDIS_HOST || 'localhost',
      port: parseInt(process.env.QUEUE_REDIS_PORT || '6379', 10),
    },
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
  },

  // WebSocket
  ws: {
    corsOrigin: process.env.WS_CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
  },
};

// Validate required configuration
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && config.env === 'production') {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}