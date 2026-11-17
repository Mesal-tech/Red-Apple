import { DateTime } from 'luxon';
import { NOTIFICATION_RETRY_BASE_MS, NOTIFICATION_RETRY_JITTER_MS, NOTIFICATION_RETRY_MAX_MS } from './notification.constants';

export function shiftOutOfQuietHours(at: Date, zone: string, start: string, end: string): Date {
  const local = DateTime.fromJSDate(at, { zone });
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minute = local.hour * 60 + local.minute;
  const from = sh * 60 + sm;
  const to = eh * 60 + em;
  const quiet = from < to ? minute >= from && minute < to : minute >= from || minute < to;
  if (!quiet) return at;
  let next = local.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
  if ((from >= to && minute >= from) || next <= local) next = next.plus({ days: 1 });
  return next.toJSDate();
}

export function calculateRetryDelay(attempt: number, randomValue = 0): number {
  return Math.min(NOTIFICATION_RETRY_MAX_MS, NOTIFICATION_RETRY_BASE_MS * (2 ** attempt)) + Math.floor(Math.max(0, Math.min(1, randomValue)) * NOTIFICATION_RETRY_JITTER_MS);
}

export function engagementDedupeKey(userId: string, localDate: string): string {
  return `engagement:${userId}:${localDate}`;
}
