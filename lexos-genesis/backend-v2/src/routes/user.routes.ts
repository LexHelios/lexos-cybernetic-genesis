import { Router } from 'express';
import { UserController } from '@/controllers/user.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validateSchema, schemas } from '@/middleware/validation';

const router = Router();
const userController = new UserController();

// All routes require authentication
router.use(authenticate);

// User profile routes
router.get('/profile', userController.getProfile);
router.put(
  '/profile',
  validateSchema(schemas.updateProfile),
  userController.updateProfile
);

// Admin only routes
router.get(
  '/',
  authorize('ADMIN'),
  userController.getAllUsers
);

router.get(
  '/:id',
  authorize('ADMIN'),
  userController.getUserById
);

router.put(
  '/:id/status',
  authorize('ADMIN'),
  userController.updateUserStatus
);

router.delete(
  '/:id',
  authorize('ADMIN'),
  userController.deleteUser
);

export default router;