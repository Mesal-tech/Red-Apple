import { DateTime } from 'luxon';
import prisma from '../db/prisma';
import { config } from '../config';
import { isInsideQuietHours, resolveEngagementTier } from './engagement';
import { chooseCopyVariant, getCopyVariants } from './notificationCopy';
import { notificationService } from './notification.service';
import { engagementDedupeKey } from './notificationMath';
import { getStreakSummary } from './streak.service';

export const engagementPlanner = {
  async run(now = new Date()): Promise<void> {
    if (!config.notifications.enabled) return;
    let cursor: string | undefined;
    while (true) {
      const users = await prisma.user.findMany({
        orderBy: { user_id: 'asc' },
        take: config.notifications.batchSize,
        ...(cursor ? { cursor: { user_id: cursor }, skip: 1 } : {}),
        select: { user_id: true, first_name: true, pregnancy_mode: true, health_profile: true },
      });
      if (!users.length) break;
      for (const user of users) await this.planForUser(user, now);
      cursor = users[users.length - 1].user_id;
    }
  },

  async planForUser(user: { user_id: string; first_name: string | null; pregnancy_mode: boolean; health_profile: unknown }, now = new Date()) {
    const activeDeviceCount = await prisma.deviceToken.count({ where: { user_id: user.user_id, disabled_at: null } });
    if (!activeDeviceCount) return;
    const preferences = await prisma.notificationPreference.upsert({
      where: { user_id: user.user_id }, update: {},
      create: { user_id: user.user_id, timezone: config.notifications.defaultTimezone, quiet_hours_start: config.notifications.defaultQuietStart, quiet_hours_end: config.notifications.defaultQuietEnd, max_per_day: config.notifications.maxPerDay },
    });
    const zone = preferences.timezone || config.notifications.defaultTimezone;
    const localNow = DateTime.fromJSDate(now, { zone });
    const localDate = localNow.toISODate();
    const [streakSummary, triageEvents, recentPushes, breakupRows, history] = await Promise.all([
      getStreakSummary(user.user_id, now),
      prisma.triageEvent.findMany({ where: { user_id: user.user_id, created_at: { gte: new Date(now.getTime() - 14 * 86400000) }, OR: [{ level: 'consult_doctor' }, { emergency_care: true }] }, take: 1, select: { id: true } }),
      prisma.notification.findMany({ where: { user_id: user.user_id, category: 'engagement', sent_at: { not: null } }, orderBy: { sent_at: 'desc' }, take: 12, select: { tier: true, sent_at: true, opened_at: true, data: true } }),
      prisma.notification.findMany({ where: { user_id: user.user_id, category: 'engagement', tier: 'breakup', sent_at: { not: null } }, orderBy: { sent_at: 'desc' }, take: 1, select: { sent_at: true } }),
      prisma.notification.findMany({ where: { user_id: user.user_id, category: 'engagement' }, orderBy: { created_at: 'desc' }, take: 6, select: { data: true } }),
    ]);
    // One ledger and one timezone-aware calculation power both the app streak and engagement rules.
    const loggedToday = streakSummary.loggedToday;
    const lastLog = streakSummary.lastCheckInAt;
    let ignoredPushes = 0;
    for (const item of recentPushes) { if (item.opened_at) break; ignoredPushes += 1; }
    const lastPush = recentPushes[0]?.sent_at || null;
    const lastBreakup = breakupRows[0]?.sent_at || null;
    const ignoredWinbacks = recentPushes.filter((item) => item.tier === 'winback' && !item.opened_at && (!lastBreakup || (item.sent_at && item.sent_at >= lastBreakup))).length;
    const profile = user.health_profile as Record<string, unknown> | null;
    const rawStage = String(profile?.stage || 'general').toLowerCase();
    const lifeStage = rawStage === 'pregnancy' || user.pregnancy_mode ? 'pregnancy' : rawStage.includes('menopause') ? 'postmenopause' : rawStage === 'cycle' ? 'cycle' : 'general';
    const tier = resolveEngagementTier({
      localHour: localNow.hour,
      streakDays: streakSummary.currentStreak,
      loggedToday,
      hoursSinceLastLog: lastLog ? (now.getTime() - lastLog.getTime()) / 3600000 : null,
      ignoredPushes,
      daysSinceLastPush: lastPush ? localNow.startOf('day').diff(DateTime.fromJSDate(lastPush, { zone }).startOf('day'), 'days').days : null,
      tone: preferences.tone === 'cheeky' ? 'cheeky' : 'gentle',
      discreetMode: false,
      lifeStage,
      recentEscalatedTriage: triageEvents.length > 0,
      pregnancyMode: user.pregnancy_mode,
      daysSinceBreakup: lastBreakup ? localNow.startOf('day').diff(DateTime.fromJSDate(lastBreakup, { zone }).startOf('day'), 'days').days : null,
      ignoredWinbacks,
      maxIgnoredWinbacks: config.notifications.maxIgnoredWinbacks,
      insideQuietHours: isInsideQuietHours(now, zone, preferences.quiet_hours_start, preferences.quiet_hours_end),
    }, now);
    if (!tier || !localDate) return;
    const used = history.map((row) => (row.data as any)?.variant).filter((id): id is string => typeof id === 'string');
    const variant = chooseCopyVariant(getCopyVariants(tier, preferences.tone === 'cheeky' ? 'cheeky' : 'gentle', false), used);
    await notificationService.enqueue({
      userId: user.user_id,
      category: 'engagement',
      tier,
      title: variant.title,
      body: variant.body,
      data: { route: 'AIAssistant', seed: preferences.tone === 'cheeky' ? 'playful_checkin' : 'gentle_checkin', variant: variant.id },
      scheduledFor: now,
      dedupeKey: engagementDedupeKey(user.user_id, localDate),
      source: 'dr_red_engagement',
    });
  },
};
