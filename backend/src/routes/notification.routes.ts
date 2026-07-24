import { Router } from 'express';
import {
  getReminders,
  updateReminderSettings,
} from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/reminders', getReminders);
router.post('/settings', updateReminderSettings);

export default router;
