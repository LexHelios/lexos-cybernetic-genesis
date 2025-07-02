import { Router } from 'express';
import { AuthController } from '@/controllers/auth.controller';
import { validateSchema, schemas } from '@/middleware/validation';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { authenticate } from '@/middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes
router.post(
  '/register',
  authRateLimiter,
  validateSchema(schemas.register),
  authController.register
);

router.post(
  '/login',
  authRateLimiter,
  validateSchema(schemas.login),
  authController.login
);

router.post(
  '/refresh',
  authController.refreshToken
);

// Protected routes
router.post(
  '/logout',
  authenticate,
  authController.logout
);

router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

router.post(
  '/change-password',
  authenticate,
  authController.changePassword
);

export default router;