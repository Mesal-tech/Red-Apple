import {
  getStreakDataSafe,
  saveStreakDataSafe,
  getCycleLogsSafe,
  getHealthProfileSafe,
  saveHealthProfileSafe,
} from '../utils/storage';
import { apiRequest } from './apiClient';

/**
 * Helper to get local YYYY-MM-DD without UTC timezone drift.
 */
export function formatLocalDate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates current, longest, annual streaks and weekly consistency
 * from a list of ISO date strings (YYYY-MM-DD).
 */
export function computeStreakStats(dateStrings = [], referenceDate = new Date()) {
  const todayStr = formatLocalDate(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  // Normalize, deduplicate, and sort ascending
  const uniqueDates = Array.from(
    new Set(
      (dateStrings || [])
        .map((d) => (typeof d === 'string' ? d.split('T')[0] : null))
        .filter(Boolean)
    )
  ).sort();

  const dateSet = new Set(uniqueDates);

  // Calculate current streak
  let currentStreak = 0;
  let cursor = new Date(referenceDate);

  if (dateSet.has(todayStr)) {
    // Today has an activity logged
    while (dateSet.has(formatLocalDate(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else if (dateSet.has(yesterdayStr)) {
    // Yesterday completed, today is still open/pending without breaking the streak
    cursor.setDate(cursor.getDate() - 1);
    while (dateSet.has(formatLocalDate(cursor))) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else {
    // Inactive for 2 or more days: streak has lapsed
    currentStreak = 0;
  }

  // Calculate longest streak across history
  let longestStreak = currentStreak;
  let currentRun = 0;
  let prevDate = null;

  for (const dStr of uniqueDates) {
    const d = new Date(`${dStr}T00:00:00`);
    if (!prevDate) {
      currentRun = 1;
    } else {
      const diffMs = d.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else if (diffDays > 1) {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
    prevDate = d;
  }

  const currentYear = referenceDate.getFullYear().toString();
  const daysThisYear = uniqueDates.filter((d) => d.startsWith(currentYear)).length;
  const weeksInRow = Math.floor(currentStreak / 7);

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    daysThisYear,
    weeksInRow,
    lastActiveDate: uniqueDates[uniqueDates.length - 1] || null,
    totalActiveDays: uniqueDates.length,
  };
}

/**
 * Returns the 7 days of the current calendar week (Monday through Sunday)
 * annotated with active status, day letter, and completion flag.
 */
export function getWeekDaysWithStatus(activeDates = [], referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const todayStr = formatLocalDate(referenceDate);
  const activeSet = new Set(
    (activeDates || []).map((x) => (typeof x === 'string' ? x.split('T')[0] : ''))
  );

  const week = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(cur);

    const isCompleted = activeSet.has(dateStr);
    const isToday = dateStr === todayStr;
    const isPast = dateStr < todayStr;
    const isFuture = dateStr > todayStr;

    week.push({
      index: i,
      dayLetter: letters[i],
      dateNumber: cur.getDate(),
      dateStr,
      isCompleted,
      isToday,
      isPast,
      isFuture,
    });
  }

  return week;
}

/**
 * Get comprehensive, accurate streak data with offline cache and backend reconciliation.
 */
export async function getStreakData() {
  const todayStr = formatLocalDate();
  let stored = await getStreakDataSafe();

  // If no stored streak data exists, backfill from past cycle logs and profile
  if (!stored || !Array.isArray(stored.activeDates)) {
    const cycleLogs = (await getCycleLogsSafe()) || [];
    const cycleDateList = cycleLogs
      .map((l) => l.date || (l.startDate ? l.startDate.split('T')[0] : null))
      .filter(Boolean);

    // Initial check-in for today so user starts on streak 1 on first use
    const initialActive = Array.from(new Set([...cycleDateList, todayStr]));
    const initialCycle = Array.from(new Set(cycleDateList));

    stored = {
      activeDates: initialActive,
      cycleDates: initialCycle,
      longestAppStreak: initialActive.length,
      longestCycleStreak: initialCycle.length,
      lastRestoredMonth: null,
      freezeAvailable: true,
    };
    await saveStreakDataSafe(stored);
  }

  // Calculate fresh deterministic stats
  const appStats = computeStreakStats(stored.activeDates);
  const cycleStats = computeStreakStats(stored.cycleDates);
  const weeklyDays = getWeekDaysWithStatus(stored.activeDates);

  const currentMonth = todayStr.substring(0, 7); // "YYYY-MM"
  const freezeAvailable = stored.lastRestoredMonth !== currentMonth;

  return {
    appStreak: appStats.currentStreak,
    longestAppStreak: Math.max(stored.longestAppStreak || 0, appStats.longestStreak),
    lastActiveDate: appStats.lastActiveDate || todayStr,
    activeDates: stored.activeDates || [],
    cycleStreak: cycleStats.currentStreak,
    longestCycleStreak: Math.max(stored.longestCycleStreak || 0, cycleStats.longestStreak),
    lastCycleDate: cycleStats.lastActiveDate,
    cycleDates: stored.cycleDates || [],
    daysThisYear: appStats.daysThisYear,
    weeksInRow: appStats.weeksInRow,
    weeklyDays,
    freezeAvailable,
    lastRestoredMonth: stored.lastRestoredMonth || null,
  };
}

/**
 * Record a user health activity (app check-in, water, vitals, cycle log).
 * Synchronously computes updated streak and persists offline-first,
 * then asynchronously syncs to backend.
 */
export async function recordStreakActivity({
  activityType = 'app_open',
  date = null,
} = {}) {
  const activityDate = date ? formatLocalDate(new Date(date)) : formatLocalDate();
  const current = await getStreakData();

  const updatedActiveDates = Array.from(new Set([...(current.activeDates || []), activityDate])).sort();
  let updatedCycleDates = current.cycleDates || [];

  if (activityType === 'cycle_log') {
    updatedCycleDates = Array.from(new Set([...updatedCycleDates, activityDate])).sort();
  }

  const appStats = computeStreakStats(updatedActiveDates);
  const cycleStats = computeStreakStats(updatedCycleDates);

  const longestAppStreak = Math.max(current.longestAppStreak || 0, appStats.longestStreak);
  const longestCycleStreak = Math.max(current.longestCycleStreak || 0, cycleStats.longestStreak);

  const updatedStreakPayload = {
    activeDates: updatedActiveDates,
    cycleDates: updatedCycleDates,
    longestAppStreak,
    longestCycleStreak,
    lastRestoredMonth: current.lastRestoredMonth,
  };

  // 1. Save locally for zero-latency UI
  await saveStreakDataSafe(updatedStreakPayload);

  // 2. Also keep health_profile in sync
  try {
    const healthProfile = (await getHealthProfileSafe()) || {};
    await saveHealthProfileSafe({
      ...healthProfile,
      streak: {
        appStreak: appStats.currentStreak,
        longestAppStreak,
        cycleStreak: cycleStats.currentStreak,
        longestCycleStreak,
        daysThisYear: appStats.daysThisYear,
        weeksInRow: appStats.weeksInRow,
        lastActiveDate: activityDate,
      },
    });
  } catch (_) {}

  // 3. Asynchronously sync to backend profile
  syncStreakToBackend({
    appStreak: appStats.currentStreak,
    longestAppStreak,
    cycleStreak: cycleStats.currentStreak,
    longestCycleStreak,
    daysThisYear: appStats.daysThisYear,
    activeDates: updatedActiveDates,
    cycleDates: updatedCycleDates,
  }).catch(() => {});

  return {
    appStreak: appStats.currentStreak,
    longestAppStreak,
    lastActiveDate: activityDate,
    activeDates: updatedActiveDates,
    cycleStreak: cycleStats.currentStreak,
    longestCycleStreak,
    lastCycleDate: cycleStats.lastActiveDate,
    cycleDates: updatedCycleDates,
    daysThisYear: appStats.daysThisYear,
    weeksInRow: appStats.weeksInRow,
    weeklyDays: getWeekDaysWithStatus(updatedActiveDates),
    freezeAvailable: current.freezeAvailable,
  };
}

/**
 * Restore streak if user had a streak of 7+ days and hasn't restored this month.
 */
export async function restoreStreak() {
  const current = await getStreakData();
  const todayStr = formatLocalDate();
  const currentMonth = todayStr.substring(0, 7);

  if (current.lastRestoredMonth === currentMonth) {
    return {
      success: false,
      message: 'You have already restored a streak this month.',
    };
  }

  if (current.longestAppStreak < 7) {
    return {
      success: false,
      message: 'A streak of 7 or more days is required for monthly restoration.',
    };
  }

  // Restore active dates by synthesizing yesterday and today
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  const restoredDates = Array.from(
    new Set([...current.activeDates, yesterdayStr, todayStr])
  ).sort();

  const updatedPayload = {
    activeDates: restoredDates,
    cycleDates: current.cycleDates,
    longestAppStreak: Math.max(current.longestAppStreak, current.appStreak + 1),
    longestCycleStreak: current.longestCycleStreak,
    lastRestoredMonth: currentMonth,
  };

  await saveStreakDataSafe(updatedPayload);
  return {
    success: true,
    message: 'Streak successfully restored!',
    streak: await getStreakData(),
  };
}

/**
 * Sync streak to backend profile API
 */
async function syncStreakToBackend(streakData) {
  try {
    await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        health_profile: {
          streak: streakData,
        },
      }),
    });
  } catch (err) {
    // Offline or network error handled gracefully
  }
}

export default {
  formatLocalDate,
  computeStreakStats,
  getWeekDaysWithStatus,
  getStreakData,
  recordStreakActivity,
  restoreStreak,
};
