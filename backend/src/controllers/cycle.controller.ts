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

    // If a period start date was logged, sync with user health_profile
    if (startDate && userId !== 'usr_anonymous') {
      const user = await userStore.findById(userId);
      if (user) {
        const updatedProfile = {
          ...(user.health_profile || {}),
          lastPeriodDate: startDate,
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

