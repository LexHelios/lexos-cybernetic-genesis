import { Router } from 'express';
import { AgentController } from '@/controllers/agent.controller';
import { authenticate, authorize } from '@/middleware/auth';
import { validateSchema, schemas } from '@/middleware/validation';

const router = Router();
const agentController = new AgentController();

// All routes require authentication
router.use(authenticate);

// Agent CRUD
router.get('/', agentController.getAllAgents);
router.get('/:id', agentController.getAgentById);
router.post(
  '/',
  validateSchema(schemas.createAgent),
  agentController.createAgent
);
router.put(
  '/:id',
  validateSchema(schemas.updateAgent),
  agentController.updateAgent
);
router.delete('/:id', agentController.deleteAgent);

// Agent actions
router.post('/:id/start', agentController.startAgent);
router.post('/:id/stop', agentController.stopAgent);
router.post('/:id/restart', agentController.restartAgent);

// Agent memory
router.get('/:id/memory', agentController.getAgentMemory);
router.put('/:id/memory', agentController.updateAgentMemory);
router.delete('/:id/memory/:key', agentController.deleteAgentMemory);

// Agent tools
router.get('/:id/tools', agentController.getAgentTools);
router.post('/:id/tools', agentController.addAgentTool);
router.put('/:id/tools/:toolId', agentController.updateAgentTool);
router.delete('/:id/tools/:toolId', agentController.deleteAgentTool);

// Agent metrics
router.get('/:id/metrics', agentController.getAgentMetrics);
router.get('/:id/logs', agentController.getAgentLogs);

// System agents (admin only)
router.get(
  '/system/all',
  authorize('ADMIN'),
  agentController.getSystemAgents
);

export default router;