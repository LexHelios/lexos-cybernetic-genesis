import { Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { AuthRequest } from '@/middleware/auth';
import { NotFoundError, AppError } from '@/utils/errors';
import { ModelService } from '@/services/model.service';

export class ModelController {
  private modelService = new ModelService();

  async getAllModels(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, provider, isActive } = req.query;

      const where: any = {};
      if (type) where.type = type;
      if (provider) where.provider = provider;
      if (isActive !== undefined) where.isActive = isActive === 'true';

      const models = await prisma.model.findMany({
        where,
        orderBy: [
          { isDefault: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      res.json({
        success: true,
        data: models,
      });
    } catch (error) {
      next(error);
    }
  }

  async getModelById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const model = await prisma.model.findUnique({
        where: { id: req.params.id },
      });

      if (!model) {
        throw new NotFoundError('Model');
      }

      res.json({
        success: true,
        data: model,
      });
    } catch (error) {
      next(error);
    }
  }

  async createModel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { name, provider, type, config, isDefault = false } = req.body;

      // Check if model name already exists
      const existing = await prisma.model.findUnique({
        where: { name },
      });

      if (existing) {
        throw new AppError('Model name already exists', 409, 'MODEL_EXISTS');
      }

      // If setting as default, unset other defaults of same type
      if (isDefault) {
        await prisma.model.updateMany({
          where: { type, isDefault: true },
          data: { isDefault: false },
        });
      }

      const model = await prisma.model.create({
        data: {
          name,
          provider,
          type,
          config,
          isDefault,
        },
      });

      res.status(201).json({
        success: true,
        data: model,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateModel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // If setting as default, unset other defaults of same type
      if (updateData.isDefault) {
        const existingModel = await prisma.model.findUnique({
          where: { id },
        });

        if (existingModel) {
          await prisma.model.updateMany({
            where: {
              type: existingModel.type,
              isDefault: true,
              NOT: { id },
            },
            data: { isDefault: false },
          });
        }
      }

      const model = await prisma.model.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        data: model,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteModel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const model = await prisma.model.findUnique({
        where: { id },
      });

      if (!model) {
        throw new NotFoundError('Model');
      }

      if (model.isDefault) {
        throw new AppError('Cannot delete default model', 400, 'DEFAULT_MODEL');
      }

      await prisma.model.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: 'Model deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async testModel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { prompt } = req.body;

      const result = await this.modelService.testModel(id, prompt);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async setDefaultModel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const model = await prisma.model.findUnique({
        where: { id },
      });

      if (!model) {
        throw new NotFoundError('Model');
      }

      // Unset other defaults of same type
      await prisma.model.updateMany({
        where: {
          type: model.type,
          isDefault: true,
        },
        data: { isDefault: false },
      });

      // Set this model as default
      await prisma.model.update({
        where: { id },
        data: { isDefault: true },
      });

      res.json({
        success: true,
        message: `${model.name} set as default ${model.type} model`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAvailableProviders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const providers = [
        {
          name: 'openai',
          displayName: 'OpenAI',
          models: ['gpt-4', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
          requiresApiKey: true,
        },
        {
          name: 'anthropic',
          displayName: 'Anthropic',
          models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
          requiresApiKey: true,
        },
        {
          name: 'ollama',
          displayName: 'Ollama',
          models: ['llama2', 'mistral', 'codellama', 'nomic-embed-text'],
          requiresApiKey: false,
        },
      ];

      res.json({
        success: true,
        data: providers,
      });
    } catch (error) {
      next(error);
    }
  }

  async getProviderModels(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { provider } = req.params;

      let models: any[] = [];

      switch (provider) {
        case 'openai':
          models = [
            { name: 'gpt-4', type: 'CHAT', description: 'Most capable GPT-4 model' },
            { name: 'gpt-4-turbo', type: 'CHAT', description: 'GPT-4 Turbo with vision' },
            { name: 'gpt-3.5-turbo', type: 'CHAT', description: 'Fast and efficient chat model' },
            { name: 'text-embedding-ada-002', type: 'EMBEDDING', description: 'Text embedding model' },
          ];
          break;

        case 'anthropic':
          models = [
            { name: 'claude-3-opus-20240229', type: 'CHAT', description: 'Most capable Claude model' },
            { name: 'claude-3-sonnet-20240229', type: 'CHAT', description: 'Balanced Claude model' },
            { name: 'claude-3-haiku-20240307', type: 'CHAT', description: 'Fast Claude model' },
          ];
          break;

        case 'ollama':
          // TODO: Fetch available models from Ollama API
          models = [
            { name: 'llama2', type: 'CHAT', description: 'Meta Llama 2' },
            { name: 'mistral', type: 'CHAT', description: 'Mistral 7B' },
            { name: 'codellama', type: 'CHAT', description: 'Code Llama' },
            { name: 'nomic-embed-text', type: 'EMBEDDING', description: 'Nomic text embeddings' },
          ];
          break;

        default:
          throw new AppError('Unknown provider', 400, 'UNKNOWN_PROVIDER');
      }

      res.json({
        success: true,
        data: models,
      });
    } catch (error) {
      next(error);
    }
  }
}