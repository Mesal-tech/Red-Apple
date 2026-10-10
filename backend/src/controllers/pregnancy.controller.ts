import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { userStore } from '../data/user.store';
import { pregnancyStore } from '../data/pregnancy.store';
import { PregnancyStatus } from '../models/pregnancy.model';

const BABY_SIZES: Record<number, { comparison: string; lengthCm: number; weightGrams: number; milestone: string; desc: string }> = {
  4: { comparison: 'Poppy Seed', lengthCm: 0.1, weightGrams: 0.1, milestone: 'Implantation & Blastocyst Development', desc: 'The amniotic sac and placenta are forming rapidly.' },
  8: { comparison: 'Raspberry', lengthCm: 1.6, weightGrams: 1.0, milestone: 'Webbed Fingers & Brain Waves', desc: 'Tiny fingers and toes are starting to develop.' },
  12: { comparison: 'Lime', lengthCm: 5.4, weightGrams: 14.0, milestone: 'Reflexes & Nail Beds', desc: 'Your baby can curl toes and make grasping motions.' },
  16: { comparison: 'Avocado', lengthCm: 11.6, weightGrams: 100.0, milestone: 'Patterned Hair & Heart Pumping 25L/Day', desc: 'Eyes are becoming sensitive to light and facial expressions develop.' },
  20: { comparison: 'Banana', lengthCm: 25.6, weightGrams: 300.0, milestone: 'Halfway Mark & Vernix Protection', desc: 'You might start feeling the flutter of your baby moving.' },
  24: { comparison: 'Ear of Corn', lengthCm: 30.0, weightGrams: 600.0, milestone: 'Hearing Voices & Rapid Lung Branches', desc: 'The baby can hear your voice and heartbeat clearly.' },
  28: { comparison: 'Eggplant', lengthCm: 37.6, weightGrams: 1000.0, milestone: 'Third Trimester & REM Dream Sleep', desc: 'Eyes can open and blink; brain wave activity mimics dreaming.' },
  32: { comparison: 'Jicama', lengthCm: 42.4, weightGrams: 1700.0, milestone: 'Practicing Breathing & Fat Layers', desc: 'Fingernails have reached fingertips and sleep cycles normalize.' },
  36: { comparison: 'Papaya', lengthCm: 47.4, weightGrams: 2600.0, milestone: 'Head Down Position & Strong Kicks', desc: 'Lungs are almost fully matured and digestive system is prepped.' },
  40: { comparison: 'Watermelon', lengthCm: 51.2, weightGrams: 3400.0, milestone: 'Full Term & Ready for Birth', desc: 'Baby is ready to meet you! Watch for rhythmic contractions.' },
};

function getWeekData(week: number) {
  const cappedWeek = Math.max(1, Math.min(42, week));
  const keys = Object.keys(BABY_SIZES).map(Number).sort((a, b) => a - b);
  let closestKey = keys[0];
  for (const k of keys) {
    if (k <= cappedWeek) closestKey = k;
  }
  return BABY_SIZES[closestKey];
}

export function computePregnancyDetails(lmpDateStr?: string, conceptionDateStr?: string): PregnancyStatus {
  const now = new Date();

  let lmpDate: Date;
  if (lmpDateStr) {
    lmpDate = new Date(lmpDateStr);
  } else if (conceptionDateStr) {
    lmpDate = new Date(new Date(conceptionDateStr).getTime() - 14 * 24 * 3600 * 1000);
  } else {
    // Default to 16 weeks pregnant if no date specified
    lmpDate = new Date(now.getTime() - 16 * 7 * 24 * 3600 * 1000);
  }

  const diffMs = now.getTime() - lmpDate.getTime();
  const diffDays = Math.max(1, Math.floor(diffMs / (24 * 3600 * 1000)));

  const currentWeek = Math.min(42, Math.floor(diffDays / 7) + 1);
  const currentDayInWeek = (diffDays % 7) + 1;

  // Due date = LMP + 280 days
  const dueDate = new Date(lmpDate.getTime() + 280 * 24 * 3600 * 1000);
  const daysUntilDueDate = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / (24 * 3600 * 1000)));

  let trimester: 1 | 2 | 3 = 1;
  if (currentWeek >= 28) trimester = 3;
  else if (currentWeek >= 14) trimester = 2;

  const weekInfo = getWeekData(currentWeek);

  return {
    active: true,
    lmp_date: lmpDate.toISOString().split('T')[0],
    conception_date: conceptionDateStr,
    current_week: currentWeek,
    current_day_in_week: currentDayInWeek,
    trimester,
    estimated_due_date: dueDate.toISOString().split('T')[0],
    days_until_due_date: daysUntilDueDate,
    baby_size_comparison: weekInfo.comparison,
    fetal_length_cm: weekInfo.lengthCm,
    fetal_weight_grams: weekInfo.weightGrams,
    weekly_milestone_title: weekInfo.milestone,
    weekly_milestone_description: weekInfo.desc,
    next_antenatal_visit_recommendation:
      trimester === 3
        ? 'Bi-weekly routine antenatal checkup & blood pressure check.'
        : 'Monthly routine antenatal wellness review & ultrasound screening.',
  };
}

export async function getPregnancyStatus(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const user = userId ? await userStore.findById(userId) : null;

    const lmpDate = user?.health_profile?.pregnancyDetails?.lmpDate || user?.health_profile?.lastPeriodDate;
    const conceptionDate = user?.health_profile?.pregnancyDetails?.conceptionDate;

    const pregnancy = computePregnancyDetails(lmpDate, conceptionDate);

    // Also fetch recent kicks & contractions if user is authenticated
    const recentKicks = userId ? await pregnancyStore.getKicksByUser(userId) : [];
    const recentContractions = userId ? await pregnancyStore.getContractionsByUser(userId) : [];

    return res.json({
      success: true,
      pregnancy,
      stats: {
        totalKickSessions: recentKicks.length,
        latestKickSession: recentKicks[0] || null,
        recentContractionsCount: recentContractions.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePregnancyLMP(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const { lmpDate, conceptionDate } = req.body;

    if (!lmpDate && !conceptionDate) {
      return res.status(400).json({ success: false, message: 'Please provide either lmpDate or conceptionDate.' });
    }

    if (userId) {
      const user = await userStore.findById(userId);
      if (user) {
        const updatedProfile = {
          ...(user.health_profile || {}),
          pregnancy_mode: true,
          pregnancyDetails: {
            lmpDate,
            conceptionDate,
            updatedAt: new Date().toISOString(),
          },
        };
        await userStore.updateUser(userId, {
          pregnancy_mode: true,
          health_profile: updatedProfile,
        });
      }
    }

    const pregnancy = computePregnancyDetails(lmpDate, conceptionDate);

    return res.json({
      success: true,
      message: 'Pregnancy tracking initialized with dynamic gestational calculation.',
      pregnancy,
    });
  } catch (error) {
    next(error);
  }
}

export async function logKickSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || 'usr_anonymous';
    const { kickCount, durationMinutes, notes } = req.body;

    if (!kickCount || typeof kickCount !== 'number') {
      return res.status(400).json({ success: false, message: 'kickCount number is required.' });
    }

    const session = await pregnancyStore.addKickSession(userId, {
      kick_count: kickCount,
      duration_minutes: durationMinutes || 10,
      notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Kick counter session saved successfully.',
      session,
    });
  } catch (error) {
    next(error);
  }
}

export async function getKickHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || 'usr_anonymous';
    const sessions = await pregnancyStore.getKicksByUser(userId);

    return res.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
}

export async function logContraction(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || 'usr_anonymous';
    const { durationSeconds, frequencyMinutes, intensity } = req.body;

    const log = await pregnancyStore.addContraction(userId, {
      duration_seconds: durationSeconds || 45,
      frequency_minutes: frequencyMinutes,
      intensity,
    });

    return res.status(201).json({
      success: true,
      message: 'Contraction logged successfully.',
      log,
    });
  } catch (error) {
    next(error);
  }
}

export async function getContractionHistory(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId || 'usr_anonymous';
    const logs = await pregnancyStore.getContractionsByUser(userId);

    return res.json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    next(error);
  }
}
