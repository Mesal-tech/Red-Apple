import { Router } from 'express';
import {
  getReminders,
  updateReminderSettings,
  registerPushToken,
  sendTestNotification,
  markReminderRead,
  markAllRemindersRead,
} from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);

router.get('/reminders', getReminders);
router.post('/settings', updateReminderSettings);
router.post('/register-token', registerPushToken);
router.post('/read', markReminderRead);
router.post('/read-all', markAllRemindersRead);
router.post('/test', sendTestNotification);

export default router;
