import { DateTime } from 'luxon';
import {
  ENGAGEMENT_BREAKUP_IGNORED_THRESHOLD,
  ENGAGEMENT_MIN_DAYS_BETWEEN_PUSHES,
  ENGAGEMENT_MISSED_ONE_HOURS,
  ENGAGEMENT_MISSED_TWO_HOURS,
  ENGAGEMENT_MORNING_END_HOUR,
  ENGAGEMENT_MORNING_START_HOUR,
  ENGAGEMENT_WINBACK_COOLDOWN_DAYS,
} from './notification.constants';

export type EngagementTier = 'morning' | 'streak_at_risk' | 'missed_1' | 'missed_2' | 'breakup' | 'winback';
export type EngagementState = {
  localHour: number;
  streakDays: number;
  loggedToday: boolean;
  hoursSinceLastLog: number | null;
  ignoredPushes: number;
  daysSinceLastPush: number | null;
  tone: 'cheeky' | 'gentle';
  discreetMode: boolean;
  lifeStage: 'cycle' | 'pregnancy' | 'postmenopause' | 'general';
  recentEscalatedTriage: boolean;
  pregnancyMode: boolean;
  daysSinceBreakup: number | null;
  ignoredWinbacks: number;
  maxIgnoredWinbacks: number;
  insideQuietHours: boolean;
};

export function resolveEngagementTier(state: EngagementState, _now: Date): EngagementTier | null {
  if (state.insideQuietHours) return null;
  if (state.daysSinceLastPush !== null && state.daysSinceLastPush < ENGAGEMENT_MIN_DAYS_BETWEEN_PUSHES) return null;

  const isMorning = state.localHour >= ENGAGEMENT_MORNING_START_HOUR && state.localHour < ENGAGEMENT_MORNING_END_HOUR;
  if (state.loggedToday) return isMorning ? 'morning' : null;

  const shouldBeNeutral = state.recentEscalatedTriage || state.pregnancyMode || state.lifeStage === 'pregnancy' || state.tone === 'gentle';
  if (shouldBeNeutral) {
    if (state.daysSinceBreakup !== null && state.daysSinceBreakup < ENGAGEMENT_WINBACK_COOLDOWN_DAYS) return null;
    if (state.ignoredWinbacks >= state.maxIgnoredWinbacks) return null;
    return isMorning ? 'morning' : state.daysSinceLastPush !== null && state.daysSinceLastPush >= ENGAGEMENT_WINBACK_COOLDOWN_DAYS ? 'winback' : null;
  }

  if (state.daysSinceBreakup !== null) {
    if ((state.daysSinceLastPush !== null && state.daysSinceLastPush < ENGAGEMENT_WINBACK_COOLDOWN_DAYS) || state.ignoredWinbacks >= state.maxIgnoredWinbacks) return null;
    return 'winback';
  }
  if (isMorning && state.streakDays > 0) return 'streak_at_risk';
  if ((state.hoursSinceLastLog ?? 0) >= ENGAGEMENT_MISSED_TWO_HOURS && state.ignoredPushes >= ENGAGEMENT_BREAKUP_IGNORED_THRESHOLD) return 'breakup';
  if ((state.hoursSinceLastLog ?? 0) >= ENGAGEMENT_MISSED_TWO_HOURS) return 'missed_2';
  if ((state.hoursSinceLastLog ?? 0) >= ENGAGEMENT_MISSED_ONE_HOURS) return 'missed_1';
  if (state.daysSinceLastPush !== null && state.daysSinceLastPush >= ENGAGEMENT_WINBACK_COOLDOWN_DAYS) return 'winback';
  return null;
}

export function isInsideQuietHours(now: Date, zone: string, start: string, end: string): boolean {
  const local = DateTime.fromJSDate(now, { zone });
  const minute = local.hour * 60 + local.minute;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const from = sh * 60 + sm;
  const to = eh * 60 + em;
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}

export function calculateStreakDays(logTimes: Date[], now: Date, zone: string): number {
  const today = DateTime.fromJSDate(now, { zone }).toISODate();
  const days = new Set(logTimes.map((date) => DateTime.fromJSDate(date, { zone }).toISODate()));
  let cursor = DateTime.fromJSDate(now, { zone }).startOf('day');
  if (!days.has(today)) cursor = cursor.minus({ days: 1 });
  let streak = 0;
  while (days.has(cursor.toISODate())) { streak += 1; cursor = cursor.minus({ days: 1 }); }
  return streak;
}
