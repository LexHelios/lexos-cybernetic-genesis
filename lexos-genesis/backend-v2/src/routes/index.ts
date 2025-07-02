import { Express } from 'express';
import { config } from '@/config';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import agentRoutes from './agent.routes';
import conversationRoutes from './conversation.routes';
import taskRoutes from './task.routes';
import modelRoutes from './model.routes';
import fileRoutes from './file.routes';
import systemRoutes from './system.routes';

export function setupRoutes(app: Express) {
  const apiPrefix = `/api/${config.apiVersion}`;

  // Public routes
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/system`, systemRoutes);

  // Protected routes
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/agents`, agentRoutes);
  app.use(`${apiPrefix}/conversations`, conversationRoutes);
  app.use(`${apiPrefix}/tasks`, taskRoutes);
  app.use(`${apiPrefix}/models`, modelRoutes);
  app.use(`${apiPrefix}/files`, fileRoutes);

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        path: req.path,
      },
    });
  });
}