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
import { rateLimit } from 'express-rate-limit';
import {
  getNotificationHistory,
  getNotificationPreferences,
  markNotificationOpened,
  registerDeviceV2,
  unregisterDeviceV2,
  updateNotificationPreferences,
  createUserReminder,
  deleteUserReminder,
  listUserReminders,
  updateUserReminder,
  getUserStreak,
  recordStreakActivity,
  restoreUserStreak,
} from '../controllers/notificationV2.controller';

const router = Router();
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const openedLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

router.use(authenticateToken);

router.post('/devices', registrationLimiter, registerDeviceV2);
router.delete('/devices', unregisterDeviceV2);
router.get('/preferences', getNotificationPreferences);
router.put('/preferences', updateNotificationPreferences);
router.get('/streak', getUserStreak);
router.post('/streak/activity', recordStreakActivity);
router.post('/streak/restore', restoreUserStreak);
router.get('/', getNotificationHistory);
router.post('/:id/opened', openedLimiter, markNotificationOpened);
router.get('/user-reminders', listUserReminders);
router.post('/user-reminders', createUserReminder);
router.put('/user-reminders/:id', updateUserReminder);
router.delete('/user-reminders/:id', deleteUserReminder);

router.get('/reminders', getReminders);
router.post('/settings', updateReminderSettings);
router.post('/register-token', registrationLimiter, registerPushToken);
router.post('/read', markReminderRead);
router.post('/read-all', markAllRemindersRead);
router.post('/test', sendTestNotification);

export default router;
