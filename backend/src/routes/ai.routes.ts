import { Router } from 'express';
import { chatWithHealthAgent, chatWithHealthAgentStream, getAiStatus } from '../controllers/ai.controller';
import { authenticateToken, optionalAuthenticateToken } from '../middleware/auth.middleware';
import { createRealtimeVoiceSession, runRealtimeVoiceTool, synthesizeRealtimeVoice } from '../controllers/ai.controller';

const router = Router();

router.use(optionalAuthenticateToken);

// Conversation endpoints (Standard & Real-time SSE Stream)
router.post('/symptom-chat', chatWithHealthAgent);
router.post('/symptom-chat-stream', chatWithHealthAgentStream);

// Signed-in users receive a one-time ticket for the server-proxied Gemini Live session.
router.post('/realtime/session', authenticateToken, createRealtimeVoiceSession);
router.post('/realtime/tool', authenticateToken, runRealtimeVoiceTool);
router.post('/realtime/speech', authenticateToken, synthesizeRealtimeVoice);

// AI agent status check
router.get('/status', getAiStatus);

export default router;
