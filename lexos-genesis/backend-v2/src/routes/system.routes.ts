import { Router } from 'express';
import { SystemController } from '@/controllers/system.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { optionalAuth } from '@/middleware/auth';

const router = Router();
const systemController = new SystemController();

// Public endpoints
router.get('/status', systemController.getSystemStatus);
router.get('/health', systemController.getHealthCheck);
router.get('/version', systemController.getVersion);

// Protected endpoints
router.get(
  '/metrics',
  optionalAuth,
  systemController.getMetrics
);

// Admin only endpoints
router.get(
  '/logs',
  authenticate,
  authorize('ADMIN'),
  systemController.getSystemLogs
);

router.get(
  '/config',
  authenticate,
  authorize('ADMIN'),
  systemController.getSystemConfig
);

router.post(
  '/maintenance',
  authenticate,
  authorize('ADMIN'),
  systemController.toggleMaintenanceMode
);

export default router;