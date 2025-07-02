// Environment configuration for LexOS Genesis

export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:3001',
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || 'http://localhost:8080',
  
  // Feature flags
  FEATURES: {
    VOICE_ENABLED: true,
    VIDEO_GENERATION: true,
    FIGMA_INTEGRATION: true,
    SMS_INTEGRATION: true,
    MULTI_MODEL_AI: true
  },
  
  // Development settings
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // API endpoints
  endpoints: {
    health: '/health',
    auth: '/api/auth',
    admin: '/api/admin',
    chat: '/api/chat',
    voice: '/api/voice',
    video: '/api/video',
    figma: '/api/figma',
    sms: '/api/sms',
    coding: '/api/coding',
    analytics: '/api/analytics',
    agents: '/api/agents',
    memory: '/api/memory'
  }
};

// Helper functions
export const getApiUrl = (endpoint: string) => {
  return `${config.API_BASE_URL}${endpoint}`;
};

export const getWsUrl = (endpoint: string = '') => {
  return `${config.WS_BASE_URL}${endpoint}`;
};

export default config;