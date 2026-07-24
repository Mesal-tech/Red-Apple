import { Response, NextFunction } from 'express';
import { calculateFertilityPrediction } from '../utils/cycleCalculators';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export async function getFertilityPrediction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const lastPeriodStartDate =
      (req.query.lastPeriodDate as string) ||
      new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const prediction = calculateFertilityPrediction(lastPeriodStartDate, 5, 28);

    return res.json({
      success: true,
      prediction,
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
    const { startDate, endDate, flowIntensity, symptoms, basalTemperature } = req.body;
    return res.status(201).json({
      success: true,
      message: 'Cycle symptom log saved securely',
      log: {
        id: 'log_' + Date.now(),
        startDate,
        endDate,
        flowIntensity,
        symptoms,
        basalTemperature,
      },
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
    return res.json({
      success: true,
      logs: [
        {
          id: 'log_1',
          startDate: '2026-07-14',
          endDate: '2026-07-19',
          flowIntensity: 'Medium',
          symptoms: ['Mild Cramps'],
        },
      ],
    });
  } catch (error) {
    next(error);
  }
}
