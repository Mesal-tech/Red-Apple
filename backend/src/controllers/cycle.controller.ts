import { Response, NextFunction } from 'express';
import { calculateFertilityPrediction } from '../utils/cycleCalculators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { cycleStore } from '../data/cycle.store';
import { userStore } from '../data/user.store';

export async function getFertilityPrediction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const user = userId ? await userStore.findById(userId) : null;

    const baselineCycleLength =
      Number(req.query.cycleLength) ||
      user?.health_profile?.cycleLength ||
      28;

    const baselinePeriodDuration =
      Number(req.query.periodDuration) ||
      user?.health_profile?.periodDuration ||
      5;

    const lastPeriodStartDate =
      (req.query.lastPeriodDate as string) ||
      user?.health_profile?.lastPeriodDate ||
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const prediction = calculateFertilityPrediction(
      lastPeriodStartDate,
      baselinePeriodDuration,
      baselineCycleLength
    );

    return res.json({
      success: true,
      prediction,
      baseline: {
        cycleLength: baselineCycleLength,
        periodDuration: baselinePeriodDuration,
        lastPeriodStartDate,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logCycleSymptoms(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || 'usr_anonymous';
    const {
      date,
      startDate,
      endDate,
      isPeriodDay,
      flowIntensity,
      feeling,
      symptoms,
      basalTemperature,
      notes,
    } = req.body;

    const logDate = date || startDate || new Date().toISOString().split('T')[0];

    const log = await cycleStore.saveLog({
      user_id: userId,
      date: logDate,
      startDate,
      endDate,
      isPeriodDay,
      flowIntensity,
      feeling,
      symptoms,
      basalTemperature,
      notes,
    });

    // Keep the profile's last period date anchored to the first day of a new bleed.
    if (userId !== 'usr_anonymous' && (startDate || isPeriodDay)) {
      const user = await userStore.findById(userId);
      if (user) {
        const existingDate = user.health_profile?.lastPeriodDate;
        const periodDuration = Number(user.health_profile?.periodDuration || 5);
        const daysSinceLastStart = existingDate
          ? Math.floor((new Date(`${logDate}T00:00:00Z`).getTime() - new Date(`${String(existingDate).split('T')[0]}T00:00:00Z`).getTime()) / 86400000)
          : Number.POSITIVE_INFINITY;
        const isNewStart = Boolean(startDate) || (Boolean(isPeriodDay) && daysSinceLastStart >= periodDuration);
        if (!isNewStart) {
          return res.status(201).json({ success: true, message: 'Cycle symptom log saved securely', log });
        }
        const updatedProfile = {
          ...(user.health_profile || {}),
          lastPeriodDate: startDate || logDate,
        };
        await userStore.updateUser(userId, { health_profile: updatedProfile });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Cycle symptom log saved securely',
      log,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCycleHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || 'usr_anonymous';
    const user = userId !== 'usr_anonymous' ? await userStore.findById(userId) : null;

    const baselineCycleLength = user?.health_profile?.cycleLength || 28;
    const baselinePeriodDuration = user?.health_profile?.periodDuration || 5;

    const logs = await cycleStore.getLogsByUser(userId);
    const stats = await cycleStore.getUserCycleStats(
      userId,
      baselineCycleLength,
      baselinePeriodDuration
    );

    return res.json({
      success: true,
      logs,
      stats,
    });
  } catch (error) {
    next(error);
  }
}

