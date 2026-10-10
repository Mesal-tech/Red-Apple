import { Router } from 'express';
import { chatWithHealthAgent, chatWithHealthAgentStream, getAiStatus } from '../controllers/ai.controller';
import { optionalAuthenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(optionalAuthenticateToken);

// Conversation endpoints (Standard & Real-time SSE Stream)
router.post('/symptom-chat', chatWithHealthAgent);
router.post('/symptom-chat-stream', chatWithHealthAgentStream);

// AI agent status check
router.get('/status', getAiStatus);

export default router;
