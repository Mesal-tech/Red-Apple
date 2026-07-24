import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getReminders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    return res.json({
      success: true,
      reminders: [
        {
          id: 'rem_1',
          type: 'period_alert',
          title: 'Period Predicted in 3 Days',
          triggerTime: '2026-07-27 09:00:00',
        },
      ],
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
    const { periodAlerts, fertileWindowAlerts, discreetTitles } = req.body;
    return res.json({
      success: true,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    next(error);
  }
}
