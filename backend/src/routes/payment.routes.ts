import { Router } from 'express';
import {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getUserPaymentHistory,
} from '../controllers/payment.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// Paystack Server-to-Server Webhook (Public, verified via signature)
router.post('/webhook', handleWebhook);

// Protected routes (strictly requires patient/user token)
router.post('/initialize', authenticateToken, initializePayment);
router.get('/verify/:reference', authenticateToken, verifyPayment);
router.get('/history', authenticateToken, getUserPaymentHistory);

export default router;
