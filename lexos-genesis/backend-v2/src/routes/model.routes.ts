import { Router } from 'express';
import { ModelController } from '@/controllers/model.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validateSchema, schemas } from '@/middleware/validation';

const router = Router();
const modelController = new ModelController();

// All routes require authentication
router.use(authenticate);

// Model CRUD
router.get('/', modelController.getAllModels);
router.get('/:id', modelController.getModelById);

// Admin only routes
router.post(
  '/',
  authorize('ADMIN'),
  validateSchema(schemas.createModel),
  modelController.createModel
);
router.put(
  '/:id',
  authorize('ADMIN'),
  modelController.updateModel
);
router.delete(
  '/:id',
  authorize('ADMIN'),
  modelController.deleteModel
);

// Model actions
router.post(
  '/:id/test',
  authorize('ADMIN'),
  modelController.testModel
);
router.post(
  '/:id/set-default',
  authorize('ADMIN'),
  modelController.setDefaultModel
);

// Provider-specific endpoints
router.get('/providers', modelController.getAvailableProviders);
router.get('/providers/:provider/models', modelController.getProviderModels);

export default router;