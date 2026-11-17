import { DateTime } from 'luxon';
import prisma from '../db/prisma';
import { config } from '../config';

// A streak restoration is available only to users who have built a week-long check-in streak.
export const STREAK_RESTORE_MIN_LENGTH_DAYS = 7;

export async function getStreakSummary(userId: string, now = new Date()) {
  const preferences = await prisma.notificationPreference.findUnique({ where: { user_id: userId }, select: { timezone: true } });
  const timezone = preferences?.timezone || config.notifications.defaultTimezone;
  const dates = await prisma.$queryRaw<Array<{ local_date: string }>>`
    SELECT DISTINCT to_char(("created_at" AT TIME ZONE 'UTC') AT TIME ZONE ${timezone}, 'YYYY-MM-DD') AS local_date
    FROM "checkin_activities"
    WHERE "user_id" = ${userId}
    ORDER BY local_date ASC`;
  const activeDates = dates.map((row) => row.local_date);
  const dateSet = new Set(activeDates);
  const localNow = DateTime.fromJSDate(now, { zone: timezone });
  const today = localNow.toISODate()!;
  let cursor = dateSet.has(today) ? localNow.startOf('day') : localNow.minus({ days: 1 }).startOf('day');
  let currentStreak = 0;
  while (dateSet.has(cursor.toISODate()!)) {
    currentStreak += 1;
    cursor = cursor.minus({ days: 1 });
  }
  let longestStreak = 0;
  let run = 0;
  let previous: DateTime | null = null;
  for (const day of activeDates) {
    const date = DateTime.fromISO(day, { zone: timezone });
    run = previous && date.diff(previous, 'days').days === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = date;
  }
  const [latest, latestRestore] = await Promise.all([
    prisma.checkInActivity.findFirst({ where: { user_id: userId }, orderBy: { created_at: 'desc' }, select: { created_at: true } }),
    prisma.checkInActivity.findFirst({ where: { user_id: userId, kind: 'streak_restore' }, orderBy: { created_at: 'desc' }, select: { created_at: true } }),
  ]);
  return {
    timezone,
    activeDates,
    currentStreak,
    longestStreak,
    lastActiveDate: activeDates[activeDates.length - 1] || null,
    loggedToday: dateSet.has(today),
    daysThisYear: activeDates.filter((day) => day.startsWith(String(localNow.year))).length,
    weeksInRow: Math.floor(currentStreak / 7),
    lastCheckInAt: latest?.created_at || null,
    lastRestoredMonth: latestRestore ? DateTime.fromJSDate(latestRestore.created_at, { zone: timezone }).toFormat('yyyy-MM') : null,
  };
}

export async function restoreUnifiedStreak(userId: string, now = new Date()) {
  const summary = await getStreakSummary(userId, now);
  if (summary.longestStreak < STREAK_RESTORE_MIN_LENGTH_DAYS) {
    return { success: false, message: `A streak of ${STREAK_RESTORE_MIN_LENGTH_DAYS} or more days is required for restoration.` };
  }
  const localNow = DateTime.fromJSDate(now, { zone: summary.timezone });
  const monthStart = localNow.startOf('month').toUTC().toJSDate();
  const nextMonth = localNow.plus({ months: 1 }).startOf('month').toUTC().toJSDate();
  const alreadyRestored = await prisma.checkInActivity.findFirst({
    where: { user_id: userId, kind: 'streak_restore', created_at: { gte: monthStart, lt: nextMonth } },
    select: { id: true },
  });
  if (alreadyRestored) return { success: false, message: 'You have already restored a streak this month.' };

  const restoredDays = [localNow.minus({ days: 1 }), localNow]
    .map((day) => day.startOf('day').plus({ hours: 12 }).toUTC().toJSDate());
  await prisma.checkInActivity.createMany({
    data: restoredDays.map((created_at) => ({ user_id: userId, kind: 'streak_restore', created_at })),
  });
  return { success: true, streak: await getStreakSummary(userId, now) };
}
