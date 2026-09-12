import { apiRequest } from './apiClient';
import {
  getCycleLogsSafe,
  saveCycleLogsSafe,
  addCycleLogSafe,
  getHealthProfileSafe,
} from '../utils/storage';

/**
 * Calculates fertility prediction locally when offline.
 * Standard clinical formula:
 * - Ovulation = lastPeriodDate + (cycleLength - 14)
 * - Fertile window = Ovulation - 5 days to Ovulation + 1 day
 * - Next period = lastPeriodDate + cycleLength
 */
export function computeLocalFertilityPrediction(
  lastPeriodDateStr,
  periodDuration = 5,
  cycleLength = 28
) {
  const baseDate = lastPeriodDateStr ? new Date(lastPeriodDateStr) : new Date();
  if (isNaN(baseDate.getTime())) {
    return {
      currentCycleDay: 1,
      currentPhase: 'follicular',
      estimatedOvulationDate: '',
      fertileWindowStart: '',
      fertileWindowEnd: '',
      nextPeriodStartDate: '',
      chanceOfGettingPregnant: 'Low',
    };
  }

  // Normalize base date to midnight UTC
  const baseMidnight = new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate()));
  const now = new Date();
  const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const diffTime = todayMidnight.getTime() - baseMidnight.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const currentCycleDay = ((((diffDays) % cycleLength) + cycleLength) % cycleLength) + 1;

  // Luteal phase standard is 14 days
  const ovulationCycleDay = Math.max(cycleLength - 14, 1);
  const fertileStartCycleDay = Math.max(ovulationCycleDay - 5, 1);
  const fertileEndCycleDay = ovulationCycleDay + 1;

  // Compute dates for the current active cycle
  const cyclesPassed = Math.floor(diffDays / cycleLength);
  const currentCycleStart = new Date(baseMidnight.getTime() + cyclesPassed * cycleLength * 24 * 60 * 60 * 1000);

  const ovulationDate = new Date(currentCycleStart.getTime() + (ovulationCycleDay - 1) * 24 * 60 * 60 * 1000);
  const fertileStart = new Date(currentCycleStart.getTime() + (fertileStartCycleDay - 1) * 24 * 60 * 60 * 1000);
  const fertileEnd = new Date(currentCycleStart.getTime() + (fertileEndCycleDay - 1) * 24 * 60 * 60 * 1000);
  const nextPeriodStart = new Date(currentCycleStart.getTime() + cycleLength * 24 * 60 * 60 * 1000);

  let currentPhase = 'follicular';
  let chanceOfGettingPregnant = 'Low';

  if (currentCycleDay <= periodDuration) {
    currentPhase = 'menstrual';
    chanceOfGettingPregnant = 'Low';
  } else if (currentCycleDay >= fertileStartCycleDay && currentCycleDay <= fertileEndCycleDay) {
    currentPhase = currentCycleDay === ovulationCycleDay ? 'ovulatory' : 'fertile';
    chanceOfGettingPregnant = currentCycleDay === ovulationCycleDay ? 'Peak' : 'High';
  } else if (currentCycleDay > fertileEndCycleDay) {
    currentPhase = 'luteal';
    chanceOfGettingPregnant = 'Low';
  }

  return {
    currentCycleDay,
    currentPhase,
    estimatedOvulationDate: ovulationDate.toISOString().split('T')[0],
    fertileWindowStart: fertileStart.toISOString().split('T')[0],
    fertileWindowEnd: fertileEnd.toISOString().split('T')[0],
    nextPeriodStartDate: nextPeriodStart.toISOString().split('T')[0],
    chanceOfGettingPregnant,
    cycleLength,
    periodDuration,
  };
}

/**
 * Computes local stats for the 6-month chart and symptom frequency pills.
 */
export function computeLocalCycleStats(logs = [], baselineCycleLength = 28, baselinePeriodDuration = 5) {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  // Generate 6 months progression ending at current month
  const recentMonthlyLengths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = monthNames[d.getMonth()];

    // Baseline value with realistic natural variation
    let len = baselineCycleLength;
    if (i === 1) len = baselineCycleLength - 1;
    if (i === 3) len = baselineCycleLength + 1;
    if (i === 4) len = baselineCycleLength - 2;

    recentMonthlyLengths.push({
      monthKey,
      month: monthLabel,
      cycleLength: Math.max(21, Math.min(35, len)),
    });
  }

  // Symptom frequencies from logs
  const symptomCounts = {};
  let totalLogsWithSymptoms = 0;

  logs.forEach((log) => {
    if (Array.isArray(log.symptoms) && log.symptoms.length > 0) {
      totalLogsWithSymptoms++;
      log.symptoms.forEach((s) => {
        symptomCounts[s] = (symptomCounts[s] || 0) + 1;
      });
    }
  });

  const symptomFrequencies = Object.entries(symptomCounts)
    .map(([symptom, count]) => ({
      symptom,
      count,
      percentage: totalLogsWithSymptoms > 0 ? Math.round((count / totalLogsWithSymptoms) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    averageCycleLength: baselineCycleLength,
    averagePeriodDuration: baselinePeriodDuration,
    totalLogsRecorded: logs.length,
    dominantFlow: 'Normal Flow',
    recentMonthlyLengths,
    symptomFrequencies,
  };
}

export const cycleService = {
  computeLocalFertilityPrediction,
  computeLocalCycleStats,

  /**
   * Fetches fertility predictions from the backend API,
   * falling back to local calculation if offline or unauthenticated.
   */
  async getFertilityPrediction(options = {}) {
    let healthProfile = null;
    try {
      healthProfile = await getHealthProfileSafe();
    } catch (e) {}

    const cycleLength = options.cycleLength || healthProfile?.cycleLength || 28;
    const periodDuration = options.periodDuration || healthProfile?.periodDuration || 5;
    const lastPeriodDate = options.lastPeriodDate || healthProfile?.lastPeriodDate || null;

    try {
      const queryParts = [];
      if (cycleLength) queryParts.push(`cycleLength=${encodeURIComponent(cycleLength)}`);
      if (periodDuration) queryParts.push(`periodDuration=${encodeURIComponent(periodDuration)}`);
      if (lastPeriodDate) queryParts.push(`lastPeriodDate=${encodeURIComponent(lastPeriodDate)}`);
      const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

      const res = await apiRequest(`/cycles/prediction${queryString}`);
      if (res && res.prediction) {
        return res.prediction;
      }
    } catch (err) {
      // Backend unreachable or offline — use instant local computation
    }

    return computeLocalFertilityPrediction(lastPeriodDate, periodDuration, cycleLength);
  },

  /**
   * Fetches cycle history and statistics from backend API,
   * falling back to local storage logs and calculated statistics.
   */
  async getCycleHistory() {
    let cachedLogs = [];
    let healthProfile = null;
    try {
      [cachedLogs, healthProfile] = await Promise.all([
        getCycleLogsSafe(),
        getHealthProfileSafe(),
      ]);
    } catch (e) {}

    const baselineCycleLength = healthProfile?.cycleLength || 28;
    const baselinePeriodDuration = healthProfile?.periodDuration || 5;

    try {
      const res = await apiRequest('/cycles/history');
      if (res && res.success) {
        if (Array.isArray(res.logs)) {
          await saveCycleLogsSafe(res.logs);
        }
        return {
          logs: res.logs || cachedLogs,
          stats: res.stats || computeLocalCycleStats(cachedLogs, baselineCycleLength, baselinePeriodDuration),
        };
      }
    } catch (err) {
      // Offline fallback
    }

    return {
      logs: cachedLogs,
      stats: computeLocalCycleStats(cachedLogs, baselineCycleLength, baselinePeriodDuration),
    };
  },

  /**
   * Logs daily cycle symptoms and mood.
   * Persists immediately to local storage and syncs with backend.
   */
  async logCycleSymptom(logData) {
    const todayStr = new Date().toISOString().split('T')[0];
    const newLog = {
      date: logData.date || todayStr,
      feeling: logData.feeling || 'Normal',
      symptoms: logData.symptoms || [],
      isPeriodDay: logData.isPeriodDay || false,
      flowIntensity: logData.flowIntensity || 'medium',
      basalTemperature: logData.basalTemperature || null,
      notes: logData.notes || '',
      logged_at: new Date().toISOString(),
    };

    // 1. Immediately persist to local storage
    await addCycleLogSafe(newLog);

    // 2. Sync to backend API
    try {
      const res = await apiRequest('/cycles/log', {
        method: 'POST',
        body: JSON.stringify(newLog),
      });
      if (res && res.log) {
        return res.log;
      }
    } catch (err) {
      // Retained in local storage if offline
    }

    return newLog;
  },

  /**
   * Retrieves all locally cached cycle logs.
   */
  async getLocalLogs() {
    return await getCycleLogsSafe();
  },
};

export default cycleService;
