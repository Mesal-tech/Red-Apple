import { apiRequest } from './apiClient';
import syncQueueService from './syncQueueService';
import {
  getCycleLogsSafe,
  saveCycleLogsSafe,
  addCycleLogSafe,
  getHealthProfileSafe,
} from '../utils/storage';
import { recordStreakActivity } from './streakService';

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

  // Helper to format local YYYY-MM-DD safely without timezone shifts
  const toLocalIso = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const ovulationDate = new Date(currentCycleStart.getTime() + (ovulationCycleDay - 1) * 24 * 60 * 60 * 1000);
  const fertileStart = new Date(currentCycleStart.getTime() + (fertileStartCycleDay - 1) * 24 * 60 * 60 * 1000);
  const fertileEnd = new Date(currentCycleStart.getTime() + (fertileEndCycleDay - 1) * 24 * 60 * 60 * 1000);
  const nextPeriodStart = new Date(currentCycleStart.getTime() + cycleLength * 24 * 60 * 60 * 1000);

  // If current cycle's fertile window is in the past, upcoming window is in next cycle
  let activeOrNextCycleStart = currentCycleStart;
  if (todayMidnight > fertileEnd) {
    activeOrNextCycleStart = nextPeriodStart;
  }
  const upcomingFertileStart = new Date(activeOrNextCycleStart.getTime() + (fertileStartCycleDay - 1) * 24 * 60 * 60 * 1000);
  const upcomingFertileEnd = new Date(activeOrNextCycleStart.getTime() + (fertileEndCycleDay - 1) * 24 * 60 * 60 * 1000);
  const upcomingOvulation = new Date(activeOrNextCycleStart.getTime() + (ovulationCycleDay - 1) * 24 * 60 * 60 * 1000);

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

  const diffUntilPeriodMs = nextPeriodStart.getTime() - todayMidnight.getTime();
  const daysUntilNextPeriod = Math.max(Math.round(diffUntilPeriodMs / (1000 * 60 * 60 * 24)), 1);

  return {
    currentCycleDay,
    currentDayOfCycle: currentCycleDay,
    currentPhase,
    daysUntilNextPeriod,
    estimatedOvulationDate: toLocalIso(upcomingOvulation),
    fertileWindowStart: toLocalIso(upcomingFertileStart),
    fertileWindowEnd: toLocalIso(upcomingFertileEnd),
    nextPeriodStartDate: toLocalIso(nextPeriodStart),
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

  // Extract logged period start dates to calculate real cycle lengths
  const periodStartDates = [];
  const sortedLogs = [...logs].sort((a, b) => {
    const da = new Date(a.date || a.startDate || a.created_at).getTime();
    const db = new Date(b.date || b.startDate || b.created_at).getTime();
    return da - db;
  });

  for (let i = 0; i < sortedLogs.length; i++) {
    const l = sortedLogs[i];
    if (l.isPeriodDay || l.flow) {
      const prev = sortedLogs[i - 1];
      const isStart = !prev || (!prev.isPeriodDay && !prev.flow) || (l.startDate && l.startDate === l.date);
      if (isStart) {
        const d = new Date(l.date || l.startDate);
        if (!isNaN(d.getTime())) periodStartDates.push(d);
      }
    }
  }

  // Calculate actual observed cycle lengths between logged periods
  const observedLengthsByMonth = {};
  for (let i = 1; i < periodStartDates.length; i++) {
    const prevDate = periodStartDates[i - 1];
    const currDate = periodStartDates[i];
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays >= 18 && diffDays <= 45) {
      const mKey = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, '0')}`;
      observedLengthsByMonth[mKey] = diffDays;
    }
  }

  // Generate 6 months progression ending at current month
  const recentMonthlyLengths = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = monthNames[d.getMonth()];

    // Use actual observed length if user has logs for that month; otherwise user's real baseline
    const len = observedLengthsByMonth[monthKey] || baselineCycleLength;

    recentMonthlyLengths.push({
      monthKey,
      month: monthLabel,
      cycleLength: Number(len),
    });
  }

  // Find real dominant flow from logs
  const flowCounts = {};
  logs.forEach((log) => {
    const f = log.flow || log.flowIntensity;
    if (f && f !== 'None') {
      flowCounts[f] = (flowCounts[f] || 0) + 1;
    }
  });
  const dominantFlow = Object.keys(flowCounts).sort((a, b) => flowCounts[b] - flowCounts[a])[0] || 'Normal Flow';

  return {
    averageCycleLength: baselineCycleLength,
    averagePeriodDuration: baselinePeriodDuration,
    totalLogsRecorded: logs.length,
    dominantFlow,
    recentMonthlyLengths,
    symptomFrequencies: [],
  };
}

/** Build observations from logged dates only; these are descriptive, not diagnoses. */
export function computeCycleInsights(logs = [], baselineCycleLength = 28) {
  const byDate = new Map();
  logs.forEach((log) => {
    const date = String(log.date || log.startDate || '').split('T')[0];
    if (date) byDate.set(date, { ...byDate.get(date), ...log, date });
  });
  const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const periodDates = sorted.filter((log) => log.isPeriodDay === true || (log.isPeriodDay == null && log.flowIntensity && log.flowIntensity !== 'None'));
  const starts = periodDates.filter((log, index) => {
    if (!index) return true;
    const previous = new Date(`${periodDates[index - 1].date}T00:00:00Z`);
    const current = new Date(`${log.date}T00:00:00Z`);
    return (current - previous) / 86400000 > 1;
  }).map((log) => log.date);
  const lengths = starts.slice(1).map((date, index) =>
    Math.round((new Date(`${date}T00:00:00Z`) - new Date(`${starts[index]}T00:00:00Z`)) / 86400000)
  ).filter((days) => days >= 18 && days <= 45);
  const insights = [];
  if (lengths.length) {
    const average = Math.round(lengths.reduce((sum, days) => sum + days, 0) / lengths.length);
    insights.push({ id: 'average', title: `Your average cycle is ${average} days`, detail: `Based on ${lengths.length} cycle${lengths.length === 1 ? '' : 's'} you logged.` });
    const latestStart = starts[starts.length - 1];
    const elapsed = latestStart ? Math.floor((Date.now() - new Date(`${latestStart}T00:00:00Z`).getTime()) / 86400000) + 1 : 0;
    if (elapsed > average + 7) {
      insights.push({ id: 'current-variation', title: 'This cycle is longer than your recent average so far', detail: `It has been ${elapsed} days since your last logged period. If you have had a period since then, add it to keep this observation up to date.` });
    }
    const recent = lengths.slice(-3);
    if (recent.length === 3 && recent[0] < recent[1] && recent[1] < recent[2]) {
      insights.unshift({ id: 'lengthening', title: 'Your last three cycles have been getting longer', detail: `They measured ${recent.join(', ')} days. Cycle lengths can vary; this is a pattern in your logs.` });
    } else if (lengths.length >= 2) {
      const range = Math.max(...lengths) - Math.min(...lengths);
      if (range >= 7) insights.push({ id: 'variation', title: 'Your cycle lengths have varied', detail: `Your logged cycles ranged from ${Math.min(...lengths)} to ${Math.max(...lengths)} days.` });
    }
  }
  const symptomCycles = new Map();
  sorted.forEach((log) => {
    const day = new Date(`${log.date}T00:00:00Z`);
    starts.forEach((start, cycleIndex) => {
      const startDay = new Date(`${start}T00:00:00Z`);
      const delta = (startDay - day) / 86400000;
      if (delta >= 1 && delta <= 5) {
        const loggedSignals = [...(log.symptoms || [])];
        if (log.feeling && !['okay', 'normal'].includes(String(log.feeling).toLowerCase())) loggedSignals.push(`mood: ${log.feeling}`);
        loggedSignals.forEach((symptom) => {
          const label = String(symptom).replace(/\s*\(intensity\s+\d+\/10\)/i, '');
          const key = label.toLowerCase();
          const entry = symptomCycles.get(key) || { label, cycles: new Set() };
          entry.cycles.add(cycleIndex);
          symptomCycles.set(key, entry);
        });
      }
    });
  });
  const recurring = [...symptomCycles.values()].filter((item) => item.cycles.size >= 2).sort((a, b) => b.cycles.size - a.cycles.size)[0];
  if (recurring) insights.push({ id: 'symptom', title: recurring.label.startsWith('mood:') ? `You often logged feeling ${recurring.label.slice(6).toLowerCase()} before your period` : `You logged ${recurring.label.toLowerCase()} before your period more than once`, detail: `This has appeared in ${recurring.cycles.size} logged cycles. It’s an observation from your entries, not a medical conclusion.` });
  if (!insights.length) insights.push({ id: 'getting-started', title: 'Your patterns will appear here', detail: `Log period dates and symptoms to learn about your own cycle. Your profile estimate is ${baselineCycleLength} days.` });
  return insights.slice(0, 3);
}

/** Estimate a user's cycle settings from their period-day entries when enough data exists. */
export function getPersonalizedCycleProfile(logs = [], fallback = {}) {
  const baselineCycleLength = Number(fallback.cycleLength || 28);
  const baselinePeriodDuration = Number(fallback.periodDuration || 5);
  const periodDates = [...new Set(logs
    .filter((log) => log.isPeriodDay === true)
    .map((log) => String(log.date || log.startDate || '').split('T')[0])
    .filter(Boolean))].sort();
  const starts = periodDates.filter((date, index) => {
    if (!index) return true;
    return (new Date(`${date}T00:00:00Z`) - new Date(`${periodDates[index - 1]}T00:00:00Z`)) / 86400000 > 1;
  });
  const lengths = starts.slice(1).map((date, index) =>
    (new Date(`${date}T00:00:00Z`) - new Date(`${starts[index]}T00:00:00Z`)) / 86400000
  ).filter((days) => days >= 18 && days <= 45).slice(-6);
  const sortedLengths = [...lengths].sort((a, b) => a - b);
  const median = sortedLengths.length
    ? sortedLengths[Math.floor(sortedLengths.length / 2)]
    : baselineCycleLength;
  const periodRuns = [];
  let run = 0;
  periodDates.forEach((date, index) => {
    const previous = periodDates[index - 1];
    run = previous && (new Date(`${date}T00:00:00Z`) - new Date(`${previous}T00:00:00Z`)) / 86400000 === 1 ? run + 1 : 1;
    if (!periodDates[index + 1] || (new Date(`${periodDates[index + 1]}T00:00:00Z`) - new Date(`${date}T00:00:00Z`)) / 86400000 > 1) periodRuns.push(run);
  });
  const observedPeriodRuns = periodRuns.slice(-4);
  const averagePeriodDuration = observedPeriodRuns.length
    ? Math.round(observedPeriodRuns.reduce((sum, days) => sum + days, 0) / observedPeriodRuns.length)
    : baselinePeriodDuration;
  return {
    cycleLength: lengths.length >= 2 ? Math.round(median) : baselineCycleLength,
    periodDuration: observedPeriodRuns.length >= 1 ? averagePeriodDuration : baselinePeriodDuration,
    lastPeriodDate: starts[starts.length - 1] || fallback.lastPeriodDate || null,
    observedCycleCount: lengths.length,
  };
}

export const cycleService = {
  computeLocalFertilityPrediction,
  computeLocalCycleStats,
  computeCycleInsights,
  getPersonalizedCycleProfile,

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
        const p = res.prediction;
        return {
          currentCycleDay: p.currentCycleDay || p.currentDayOfCycle || 1,
          currentDayOfCycle: p.currentDayOfCycle || p.currentCycleDay || 1,
          currentPhase: (p.currentPhase || 'follicular').toLowerCase(),
          daysUntilNextPeriod: p.daysUntilNextPeriod,
          nextPeriodStartDate: p.nextPeriodStartDate,
          isFertileWindow: Boolean(p.isFertileWindow),
          fertileWindowStart: p.fertileWindowStart,
          fertileWindowEnd: p.fertileWindowEnd,
          estimatedOvulationDate: p.estimatedOvulationDate,
          chanceOfGettingPregnant: p.chanceOfGettingPregnant || p.chanceOfPregnancy || 'Low',
          cycleLength: Number(p.cycleLength || cycleLength),
          periodDuration: Number(p.periodDuration || periodDuration),
        };
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

    if (newLog.isPeriodDay) {
      try {
        const profile = await getHealthProfileSafe();
        const priorDate = profile?.lastPeriodDate ? new Date(`${String(profile.lastPeriodDate).split('T')[0]}T00:00:00Z`) : null;
        const thisDate = new Date(`${newLog.date}T00:00:00Z`);
        const gap = priorDate ? Math.floor((thisDate - priorDate) / 86400000) : Number.POSITIVE_INFINITY;
        if (!priorDate || gap >= Number(profile?.periodDuration || 5)) {
          await saveHealthProfileSafe({ ...(profile || {}), lastPeriodDate: newLog.date });
        }
      } catch (_) {}
    }

    // 1. Immediately persist to local storage
    await addCycleLogSafe(newLog);

    // 2. Advance streak activity deterministically
    try {
      await recordStreakActivity({
        activityType: 'cycle_log',
      });
    } catch (_) {}

    // 3. Sync to backend API
    try {
      const res = await apiRequest('/cycles/log', {
        method: 'POST',
        body: JSON.stringify(newLog),
      });
      if (res && res.log) {
        return res.log;
      }
    } catch (err) {
      // Offline fallback: enqueue into persistent background retry queue
      await syncQueueService.enqueue('CYCLE_LOG', newLog);
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
