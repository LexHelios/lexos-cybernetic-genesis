import { Router } from 'express';
import { ConversationController } from '@/controllers/conversation.controller';
import { authenticate } from '@/middleware/auth';
import { validateSchema, schemas } from '@/middleware/validation';

const router = Router();
const conversationController = new ConversationController();

// All routes require authentication
router.use(authenticate);

// Conversation CRUD
router.get('/', conversationController.getAllConversations);
router.get('/:id', conversationController.getConversationById);
router.post('/', conversationController.createConversation);
router.put('/:id', conversationController.updateConversation);
router.delete('/:id', conversationController.deleteConversation);

// Messages
router.get('/:id/messages', conversationController.getMessages);
router.post(
  '/:id/messages',
  validateSchema(schemas.sendMessage),
  conversationController.sendMessage
);

// Agents in conversation
router.get('/:id/agents', conversationController.getConversationAgents);
router.post('/:id/agents/:agentId', conversationController.addAgentToConversation);
router.delete('/:id/agents/:agentId', conversationController.removeAgentFromConversation);

// Archive/Restore
router.post('/:id/archive', conversationController.archiveConversation);
router.post('/:id/restore', conversationController.restoreConversation);

export default router;