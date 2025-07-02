import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import Joi from 'joi';
import { AppError } from '@/utils/errors';

// Express validator middleware
export function validate(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array(),
      },
    });
  }
  next();
}

// Joi validation middleware
export function validateSchema(schema: Joi.Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details,
        },
      });
    }

    next();
  };
}

// Common validation schemas
export const schemas = {
  // User schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(8).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    username: Joi.string().alphanum().min(3).max(30),
    email: Joi.string().email(),
  }),

  // Agent schemas
  createAgent: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    description: Joi.string().max(500),
    type: Joi.string().valid('SYSTEM', 'ASSISTANT', 'SPECIALIST', 'COORDINATOR', 'CUSTOM').required(),
    capabilities: Joi.array().items(Joi.string()),
    config: Joi.object(),
  }),

  updateAgent: Joi.object({
    name: Joi.string().min(3).max(50),
    description: Joi.string().max(500),
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'SUSPENDED'),
    capabilities: Joi.array().items(Joi.string()),
    config: Joi.object(),
  }),

  // Task schemas
  createTask: Joi.object({
    name: Joi.string().required(),
    description: Joi.string(),
    type: Joi.string().required(),
    priority: Joi.number().integer().min(0).max(10).default(0),
    payload: Joi.object().required(),
    agentId: Joi.string().uuid(),
    scheduledAt: Joi.date().iso(),
  }),

  // Message schemas
  sendMessage: Joi.object({
    content: Joi.string().required(),
    metadata: Joi.object(),
  }),

  // Model schemas
  createModel: Joi.object({
    name: Joi.string().required(),
    provider: Joi.string().required(),
    type: Joi.string().valid('CHAT', 'COMPLETION', 'EMBEDDING', 'IMAGE', 'AUDIO').required(),
    config: Joi.object().required(),
    isDefault: Joi.boolean(),
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

// Sanitize input middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Implement input sanitization logic here
  // For example: remove HTML tags, trim whitespace, etc.
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj.trim();
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  return obj;
}