import {
  getStreakDataSafe,
  saveStreakDataSafe,
  getCycleLogsSafe,
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

  // The backend's CheckInActivity ledger is the canonical source shared with engagement notifications.
  try {
    const response = await apiRequest('/notifications/streak', {}, 3000);
    const remote = response?.success && response.streak;
    if (remote && Array.isArray(remote.activeDates)) {
      const canonical = {
        activeDates: remote.activeDates,
        longestAppStreak: remote.longestStreak,
        lastRestoredMonth: remote.lastRestoredMonth,
        streakDefinition: 'health_checkin_v2',
      };
      await saveStreakDataSafe(canonical);
      return {
        appStreak: remote.currentStreak,
        longestAppStreak: remote.longestStreak,
        lastActiveDate: remote.lastActiveDate,
        activeDates: remote.activeDates,
        daysThisYear: remote.daysThisYear,
        weeksInRow: remote.weeksInRow,
        weeklyDays: getWeekDaysWithStatus(remote.activeDates),
        freezeAvailable: remote.lastRestoredMonth !== todayStr.substring(0, 7),
        lastRestoredMonth: remote.lastRestoredMonth,
      };
    }
  } catch (_) {
    // Use the same qualifying activity definition from the local cache while offline.
  }

  // Discard the old app-open-based dates once and seed offline cache from real cycle logs.
  if (!stored || !Array.isArray(stored.activeDates) || stored.streakDefinition !== 'health_checkin_v2') {
    const cycleLogs = (await getCycleLogsSafe()) || [];
    const initialActive = Array.from(new Set(cycleLogs
      .map((log) => log.created_at || log.logged_at
        ? formatLocalDate(new Date(log.created_at || log.logged_at))
        : log.date || (log.startDate ? log.startDate.split('T')[0] : null))
      .filter(Boolean))).sort();
    const initialStats = computeStreakStats(initialActive);

    stored = {
      activeDates: initialActive,
      longestAppStreak: initialStats.longestStreak,
      lastRestoredMonth: stored?.lastRestoredMonth || null,
      freezeAvailable: true,
      streakDefinition: 'health_checkin_v2',
    };
    await saveStreakDataSafe(stored);
  }

  // Calculate fresh deterministic stats
  const appStats = computeStreakStats(stored.activeDates);
  const weeklyDays = getWeekDaysWithStatus(stored.activeDates);

  const currentMonth = todayStr.substring(0, 7); // "YYYY-MM"
  const freezeAvailable = stored.lastRestoredMonth !== currentMonth;

  return {
    appStreak: appStats.currentStreak,
    longestAppStreak: Math.max(stored.longestAppStreak || 0, appStats.longestStreak),
    lastActiveDate: appStats.lastActiveDate,
    activeDates: stored.activeDates || [],
    daysThisYear: appStats.daysThisYear,
    weeksInRow: appStats.weeksInRow,
    weeklyDays,
    freezeAvailable,
    lastRestoredMonth: stored.lastRestoredMonth || null,
  };
}

/**
 * Record a qualifying health check-in locally; backend-owned activities are recorded by their
 * domain services and manual check-ins use the streak activity API.
 */
export async function recordStreakActivity({
  activityType,
} = {}) {
  const qualifyingKinds = new Set(['cycle_log', 'symptom_checkin', 'daily_checkin', 'dr_red_chat']);
  if (!qualifyingKinds.has(activityType)) return getStreakData();
  const activityDate = formatLocalDate();
  let current = await getStreakDataSafe();
  if (!current || !Array.isArray(current.activeDates) || current.streakDefinition !== 'health_checkin_v2') {
    const cycleLogs = (await getCycleLogsSafe()) || [];
    const activeDates = Array.from(new Set(cycleLogs
      .map((log) => log.created_at || log.logged_at
        ? formatLocalDate(new Date(log.created_at || log.logged_at))
        : log.date || (log.startDate ? log.startDate.split('T')[0] : null))
      .filter(Boolean))).sort();
    const stats = computeStreakStats(activeDates);
    current = {
      activeDates,
      longestAppStreak: stats.longestStreak,
      streakDefinition: 'health_checkin_v2',
    };
  }

  const updatedActiveDates = Array.from(new Set([...(current.activeDates || []), activityDate])).sort();
  const appStats = computeStreakStats(updatedActiveDates);

  const longestAppStreak = Math.max(current.longestAppStreak || 0, appStats.longestStreak);

  const updatedStreakPayload = {
    activeDates: updatedActiveDates,
    longestAppStreak,
    lastRestoredMonth: current.lastRestoredMonth,
    streakDefinition: 'health_checkin_v2',
  };

  // 1. Save locally for zero-latency UI
  await saveStreakDataSafe(updatedStreakPayload);

  // Cycle logs and Dr. Red chats are recorded by their backend services. The local-only menopause
  // symptom check-in uses this authenticated event endpoint so all sources enter the same ledger.
  if (activityType === 'symptom_checkin' || activityType === 'daily_checkin') {
    apiRequest('/notifications/streak/activity', {
      method: 'POST',
      body: JSON.stringify({ kind: activityType }),
    }).catch(() => {});
  }

  return {
    appStreak: appStats.currentStreak,
    longestAppStreak,
    lastActiveDate: activityDate,
    activeDates: updatedActiveDates,
    daysThisYear: appStats.daysThisYear,
    weeksInRow: appStats.weeksInRow,
    weeklyDays: getWeekDaysWithStatus(updatedActiveDates),
    freezeAvailable: current.freezeAvailable,
  };
}

export async function restoreStreak() {
  try {
    const response = await apiRequest('/notifications/streak/restore', { method: 'POST' });
    if (response?.success) return { ...response, streak: await getStreakData() };
    return { success: false, message: response?.message || 'Could not restore the streak.' };
  } catch (_) {
    return { success: false, message: 'Connect to the internet to restore your streak.' };
  }
}

export const getLiveStreakData = getStreakData;

export default {
  formatLocalDate,
  computeStreakStats,
  getWeekDaysWithStatus,
  getStreakData,
  getLiveStreakData,
  recordStreakActivity,
  restoreStreak,
};
