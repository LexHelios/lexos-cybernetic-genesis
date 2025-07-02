import { Router } from 'express';
import { TaskController } from '@/controllers/task.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validateSchema, schemas } from '@/middleware/validation';

const router = Router();
const taskController = new TaskController();

// All routes require authentication
router.use(authenticate);

// Task CRUD
router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post(
  '/',
  validateSchema(schemas.createTask),
  taskController.createTask
);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

// Task actions
router.post('/:id/cancel', taskController.cancelTask);
router.post('/:id/retry', taskController.retryTask);

// Task subtasks
router.get('/:id/subtasks', taskController.getSubtasks);

// Queue management (admin only)
router.get(
  '/queue/status',
  authorize('ADMIN'),
  taskController.getQueueStatus
);
router.post(
  '/queue/clean',
  authorize('ADMIN'),
  taskController.cleanQueue
);

export default router;