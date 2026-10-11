import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';
import { userStore } from '../data/user.store';
import prisma from '../db/prisma';

export async function getReminders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const reminders = await notificationService.computeUserReminders(userId);
    const unreadCount = reminders.filter((r) => !r.isRead).length;

    return res.json({
      success: true,
      count: reminders.length,
      unreadCount,
      reminders,
    });
  } catch (error) {
    next(error);
  }
}

export async function registerPushToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, message: 'Push token is required.' });
    }

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const tokens = new Set(user.push_tokens || []);
    tokens.add(token);

    await userStore.updateUser(userId, {
      push_tokens: Array.from(tokens),
    });

    // Also sync to Prisma / PostgreSQL if available
    try {
      await prisma.user.upsert({
        where: { user_id: userId },
        update: {
          pregnancy_mode: user.pregnancy_mode || false,
          health_profile: (user.health_profile as any) || undefined,
        },
        create: {
          user_id: userId,
          name: user.name || 'User',
          email: user.email,
          phone: user.phone,
          password_hash: user.password_hash || '',
          pregnancy_mode: user.pregnancy_mode || false,
          role: user.role || 'user',
          health_profile: (user.health_profile as any) || undefined,
        },
      });

      await prisma.pushToken.upsert({
        where: { token },
        update: { user_id: userId },
        create: { user_id: userId, token },
      });
    } catch (prismaErr: any) {
      console.warn('[registerPushToken] Prisma pushToken sync notice:', prismaErr?.message);
    }

    return res.json({
      success: true,
      message: 'Push notification token registered successfully.',
    });
  } catch (error) {
    next(error);
  }
}

export async function updateReminderSettings(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const {
      periodAlerts,
      fertileWindowAlerts,
      appointmentAlerts,
      discreetTitles,
      dailyLogReminder,
      medicationAlerts,
      hydrationAlerts,
      weeklyGrowthAlerts,
    } = req.body;

    const user = await userStore.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatedSettings = {
      ...(user.notification_settings || {}),
      ...(periodAlerts !== undefined && { periodAlerts }),
      ...(fertileWindowAlerts !== undefined && { fertileWindowAlerts }),
      ...(appointmentAlerts !== undefined && { appointmentAlerts }),
      ...(discreetTitles !== undefined && { discreetTitles }),
      ...(dailyLogReminder !== undefined && { dailyLogReminder }),
      ...(medicationAlerts !== undefined && { medicationAlerts }),
      ...(hydrationAlerts !== undefined && { hydrationAlerts }),
      ...(weeklyGrowthAlerts !== undefined && { weeklyGrowthAlerts }),
    };

    await userStore.updateUser(userId, {
      notification_settings: updatedSettings,
    });

    return res.json({
      success: true,
      message: 'Notification preferences updated successfully.',
      settings: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
}

export async function markReminderRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { reminderId } = req.body;
    if (!reminderId || typeof reminderId !== 'string') {
      return res.status(400).json({ success: false, message: 'reminderId is required.' });
    }

    await notificationService.markReminderRead(userId, reminderId);

    return res.json({
      success: true,
      message: 'Reminder marked as read.',
      reminderId,
    });
  } catch (error) {
    next(error);
  }
}

export async function markAllRemindersRead(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    await notificationService.markAllRemindersRead(userId);

    return res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
}

export async function sendTestNotification(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const user = await userStore.findById(userId);
    const tokens = user?.push_tokens || [];

    const testPayload = {
      id: `rem_test_${Date.now()}`,
      title: 'Red Apple Health Alert 🍎',
      body: 'Notifications are actively working! You will receive your cycle, medication & doctor alerts on time.',
      timestamp: new Date().toISOString(),
    };

    if (tokens.length > 0) {
      const result = await notificationService.sendExpoPush(
        tokens,
        testPayload.title,
        testPayload.body,
        { test: true }
      );
      return res.json({
        success: true,
        message: 'Push notification dispatched to device.',
        result,
        testPayload,
      });
    }

    return res.json({
      success: true,
      simulated: true,
      message: 'Test notification created (no push token registered on server yet).',
      testPayload,
    });
  } catch (error) {
    next(error);
  }
}
