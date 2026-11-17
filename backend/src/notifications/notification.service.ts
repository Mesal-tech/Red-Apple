import { randomUUID } from 'crypto';
import { DateTime } from 'luxon';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { Prisma } from '@prisma/client';
import prisma from '../db/prisma';
import { config } from '../config';
import { preferencesService } from './preferences.service';
import { ENGAGEMENT_MAX_PER_LOCAL_DAY, ENGAGEMENT_PLANNER_INTERVAL_MS, NOTIFICATION_BODY_MAX_BYTES, NOTIFICATION_DATA_MAX_BYTES, NOTIFICATION_MAINTENANCE_INTERVAL_MS } from './notification.constants';
import { calculateRetryDelay, shiftOutOfQuietHours } from './notificationMath';

export type NotificationInput = {
  userId: string;
  category: 'reminders' | 'appointments' | 'engagement' | 'insights';
  tier?: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  scheduledFor: Date;
  dedupeKey: string;
  source: string;
  sourceRef?: string;
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').trim();
const ALLOWED_DATA_KEYS = new Set(['route', 'seed', 'reminder_id', 'booking_id', 'variant', 'notification_id', 'category']);
const ALLOWED_ROUTES = new Set(['AIAssistant', 'Appointments']);
const ALLOWED_SEEDS = new Set(['gentle_checkin', 'playful_checkin', 'streak_win']);
export const notificationService = {
  async enqueue(input: NotificationInput) {
    if (Buffer.byteLength(JSON.stringify(input.data || {}), 'utf8') > NOTIFICATION_DATA_MAX_BYTES) throw new Error('Notification data exceeds the 3 KB limit');
    if (Buffer.byteLength(input.body, 'utf8') > NOTIFICATION_BODY_MAX_BYTES) throw new Error('Notification body exceeds the configured byte limit');
    if (input.category === 'engagement' && input.body.length >= 120) throw new Error('Engagement copy must be under 120 characters');
    for (const [key, value] of Object.entries(input.data || {})) {
      if (!ALLOWED_DATA_KEYS.has(key) || typeof value !== 'string' || value.length > 128) throw new Error('Notification data contains an unsupported value');
      if (key === 'route' && !ALLOWED_ROUTES.has(value)) throw new Error('Notification route is not allowed');
      if (key === 'seed' && !ALLOWED_SEEDS.has(value)) throw new Error('Notification seed is not allowed');
    }
    const prefs = await preferencesService.getOrCreate(input.userId);
    const categories = prefs.categories as Record<string, boolean>;
    let status = 'pending';
    let suppressedReason: string | null = null;
    let scheduledFor = input.scheduledFor;
    if (!config.notifications.enabled) { status = 'suppressed'; suppressedReason = 'global_disabled'; }
    else if (!prefs.enabled) { status = 'suppressed'; suppressedReason = 'user_disabled'; }
    else if (categories[input.category] === false) { status = 'suppressed'; suppressedReason = 'category_disabled'; }
    else {
      if (input.category === 'engagement') scheduledFor = shiftOutOfQuietHours(scheduledFor, prefs.timezone, prefs.quiet_hours_start, prefs.quiet_hours_end);
      const local = DateTime.fromJSDate(scheduledFor, { zone: prefs.timezone });
      const dayStart = local.startOf('day').toJSDate();
      const dayEnd = local.endOf('day').toJSDate();
      const already = await prisma.notification.count({ where: { user_id: input.userId, status: { in: ['pending', 'processing', 'sent'] }, scheduled_for: { gte: dayStart, lte: dayEnd } } });
      const categoryCount = input.category === 'engagement' ? await prisma.notification.count({ where: { user_id: input.userId, category: 'engagement', status: { in: ['pending', 'processing', 'sent'] }, scheduled_for: { gte: dayStart, lte: dayEnd } } }) : 0;
      if (already >= Math.min(prefs.max_per_day, config.notifications.globalMaxPerDay)) { status = 'suppressed'; suppressedReason = 'global_daily_limit'; }
      else if (input.category === 'engagement' && categoryCount >= ENGAGEMENT_MAX_PER_LOCAL_DAY) { status = 'suppressed'; suppressedReason = 'daily_engagement_limit'; }
    }
    const safeTitle = stripHtml(input.title).slice(0, 120);
    const safeBody = stripHtml(input.body).slice(0, 240);
    const data = input.data || {};
    const rowData = { ...data };
    try {
      const row = await prisma.notification.create({ data: {
        user_id: input.userId,
        category: input.category,
        tier: input.tier,
        title: safeTitle,
        body: safeBody,
        data: rowData as Prisma.InputJsonValue,
        scheduled_for: scheduledFor,
        status,
        dedupe_key: input.dedupeKey,
        source: input.source,
        source_ref: input.sourceRef,
        suppressed_reason: suppressedReason,
      } });
      console.info(JSON.stringify(row.status === 'suppressed'
        ? { event: 'notification.suppressed', notification_id: row.id, reason: row.suppressed_reason }
        : { event: 'notification.enqueued', notification_id: row.id, category: row.category }));
      return row;
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await prisma.notification.findUnique({ where: { dedupe_key: input.dedupeKey } });
        if (existing) return existing;
      }
      throw error;
    }
  },
};

export class NotificationDispatcher {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopping = false;
  private lastHeartbeatAt: Date | null = null;
  private lastEngagementPlannerAt = 0;
  private lastMaintenanceAt = 0;
  private readonly workerId = `${process.pid}:${randomUUID()}`;
  private readonly expo = new Expo({ accessToken: config.notifications.expoAccessToken || undefined });

  start() {
    if (!config.notifications.workerEnabled || !config.notifications.enabled || this.timer) return;
    this.stopping = false;
    this.timer = setInterval(() => { void this.runOnce(); }, config.notifications.dispatchIntervalMs);
    void this.runOnce();
  }

  getStatus() { return { enabled: config.notifications.enabled && config.notifications.workerEnabled, lastHeartbeatAt: this.lastHeartbeatAt }; }

  async stop() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    while (this.running) await new Promise((resolve) => setTimeout(resolve, 100));
    await prisma.notification.updateMany({ where: { status: 'processing', locked_by: this.workerId }, data: { status: 'pending', locked_at: null, locked_by: null } });
  }

  async runOnce() {
    if (this.running || this.stopping || !config.notifications.enabled) return;
    this.running = true;
    this.lastHeartbeatAt = new Date();
    try {
      const rows = await prisma.$queryRaw<any[]>`
        UPDATE "notifications" SET "status" = 'processing', "locked_at" = NOW(), "locked_by" = ${this.workerId}
        WHERE "id" IN (
          SELECT "id" FROM "notifications"
          WHERE "status" = 'pending' AND "scheduled_for" <= NOW()
            AND ("next_attempt_at" IS NULL OR "next_attempt_at" <= NOW())
          ORDER BY "scheduled_for" LIMIT ${config.notifications.batchSize} FOR UPDATE SKIP LOCKED
        ) RETURNING *`;
      for (const row of rows) await this.dispatch(row);
      await this.materializeDueReminders();
      if (Date.now() - this.lastEngagementPlannerAt >= ENGAGEMENT_PLANNER_INTERVAL_MS) {
        this.lastEngagementPlannerAt = Date.now();
        const { engagementPlanner } = await import('./engagementPlanner');
        await engagementPlanner.run();
      }
      if (Date.now() - this.lastMaintenanceAt >= NOTIFICATION_MAINTENANCE_INTERVAL_MS) {
        this.lastMaintenanceAt = Date.now();
        await this.runRetentionMaintenance();
      }
      await this.recoverStuckRows();
      await this.pollReceipts();
    } catch (error: any) {
      console.error(JSON.stringify({ event: 'notification.worker_error', code: error?.code || error?.name || 'worker_error' }));
    } finally { this.running = false; }
  }

  private async materializeDueReminders() {
    const horizon = new Date(Date.now() + config.notifications.dispatchIntervalMs * 2);
    await prisma.$transaction(async (tx) => {
      const reminders = await tx.$queryRaw<any[]>`
        SELECT "reminder_id", "user_id", "trigger_time", "timezone", "recurrence_rule"
        FROM "reminders"
          WHERE "enabled" = true AND "sent" = false AND "trigger_time" <= ${horizon}
            AND ("last_enqueued_for" IS NULL OR "last_enqueued_for" <> "trigger_time")
        ORDER BY "trigger_time" LIMIT ${config.notifications.batchSize} FOR UPDATE SKIP LOCKED`;
      for (const reminder of reminders) {
        const preferences = await tx.notificationPreference.upsert({
          where: { user_id: reminder.user_id }, update: {},
          create: { user_id: reminder.user_id, timezone: config.notifications.defaultTimezone, quiet_hours_start: config.notifications.defaultQuietStart, quiet_hours_end: config.notifications.defaultQuietEnd, max_per_day: config.notifications.maxPerDay },
        });
        const plannedAt = new Date(reminder.trigger_time);
        const localScheduled = plannedAt > new Date() ? plannedAt : new Date();
        const categories = preferences.categories as Record<string, boolean>;
        const localDay = DateTime.fromJSDate(localScheduled, { zone: preferences.timezone });
        const dailyCount = await tx.notification.count({ where: { user_id: reminder.user_id, status: { in: ['pending', 'processing', 'sent'] }, scheduled_for: { gte: localDay.startOf('day').toJSDate(), lte: localDay.endOf('day').toJSDate() } } });
        const suppressedReason = !config.notifications.enabled ? 'global_disabled' : !preferences.enabled ? 'user_disabled' : categories.reminders === false ? 'category_disabled' : dailyCount >= Math.min(preferences.max_per_day, config.notifications.globalMaxPerDay) ? 'global_daily_limit' : null;
        const suppressed = suppressedReason !== null;
        const dedupeKey = `reminder:${reminder.reminder_id}:${plannedAt.toISOString()}`;
        try {
          await tx.notification.create({ data: {
            user_id: reminder.user_id,
            category: 'reminders',
            title: 'A reminder for you',
            body: 'Open Red Apple to view your reminder.',
            data: { route: 'AIAssistant', seed: 'gentle_checkin', reminder_id: reminder.reminder_id },
            scheduled_for: localScheduled,
            status: suppressed ? 'suppressed' : 'pending',
            suppressed_reason: suppressedReason,
            dedupe_key: dedupeKey,
            source: 'reminder',
            source_ref: reminder.reminder_id,
          } });
        } catch (error: any) {
          if (error?.code !== 'P2002') throw error;
        }
        const zone = reminder.timezone || preferences.timezone || config.notifications.defaultTimezone;
        const localTrigger = DateTime.fromJSDate(plannedAt, { zone });
        const recurrence = String(reminder.recurrence_rule || '').toUpperCase();
        const next = recurrence === 'DAILY' ? localTrigger.plus({ days: 1 }) : recurrence === 'WEEKLY' ? localTrigger.plus({ weeks: 1 }) : recurrence === 'MONTHLY' ? localTrigger.plus({ months: 1 }) : null;
        await tx.reminder.update({ where: { reminder_id: reminder.reminder_id }, data: {
          last_enqueued_for: plannedAt,
          ...(next?.isValid ? { trigger_time: next.toUTC().toJSDate(), sent: false } : { enabled: false }),
        } });
      }
    });
  }

  private async dispatch(row: any) {
    const allTokens = await prisma.deviceToken.findMany({ where: { user_id: row.user_id, disabled_at: null } });
    const completedDeliveries = await prisma.notificationDelivery.findMany({ where: { notification_id: row.id, ticket_status: 'ok' }, select: { device_token_id: true } });
    const deliveredTokenIds = new Set(completedDeliveries.map((delivery) => delivery.device_token_id));
    const tokens = allTokens.filter((token) => !deliveredTokenIds.has(token.id));
    if (!tokens.length) {
      if (allTokens.length > 0 && deliveredTokenIds.size === allTokens.length) {
        await prisma.notification.update({ where: { id: row.id }, data: { status: 'sent', sent_at: new Date(), locked_at: null, locked_by: null } });
        await this.markReminderSent(row);
        console.info(JSON.stringify({ event: 'notification.sent', notification_id: row.id }));
      } else await this.finish(row.id, 'failed', 'no_active_devices');
      return;
    }
    const payloadData = { ...(row.data as object), notification_id: row.id, category: row.category };
    if (Buffer.byteLength(JSON.stringify(payloadData), 'utf8') > NOTIFICATION_DATA_MAX_BYTES) { await this.finish(row.id, 'failed', 'payload_too_large'); return; }
    const messages: ExpoPushMessage[] = tokens.map((token) => ({
      to: token.expo_push_token,
      title: row.title,
      body: row.body,
      data: payloadData,
      channelId: row.category === 'appointments' ? 'appointments' : row.category === 'reminders' ? 'reminders' : 'dr-red',
      sound: row.category === 'engagement' ? undefined : 'default',
      priority: row.category === 'engagement' ? 'default' : 'high',
      ttl: 86400,
    }));
    if (messages.some((message) => Buffer.byteLength(JSON.stringify(message), 'utf8') > 4096)) { await this.finish(row.id, 'failed', 'message_too_large'); return; }
    try {
      const chunks = this.expo.chunkPushNotifications(messages);
      let offset = 0;
      let successes = 0;
      let transientFailure = false;
      for (const chunk of chunks) {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (let index = 0; index < tickets.length; index += 1) {
          const ticket = tickets[index];
          const token = tokens[offset + index];
          const errorCode = ticket.status === 'error' ? ticket.details?.error || 'ExpoTicketError' : null;
          if (ticket.status === 'ok') successes += 1;
          if (errorCode === 'DeviceNotRegistered') {
            await prisma.deviceToken.update({ where: { id: token.id }, data: { disabled_at: new Date(), disabled_reason: errorCode } });
            console.info(JSON.stringify({ event: 'notification.token_disabled', notification_id: row.id, code: errorCode }));
          }
          if (errorCode && !['DeviceNotRegistered', 'MessageTooBig', 'InvalidCredentials', 'MismatchSenderId', 'InvalidPushToken'].includes(errorCode)) transientFailure = true;
          await prisma.notificationDelivery.upsert({
            where: { notification_id_device_token_id: { notification_id: row.id, device_token_id: token.id } },
            create: { notification_id: row.id, device_token_id: token.id, ticket_status: ticket.status, expo_ticket_id: ticket.status === 'ok' ? ticket.id : null, error_code: errorCode },
            update: { ticket_status: ticket.status, expo_ticket_id: ticket.status === 'ok' ? ticket.id : null, receipt_status: null, receipt_checked_at: null, error_code: errorCode },
          });
        }
        offset += chunk.length;
      }
      if (transientFailure) throw new Error('TransientExpoTicketError');
      if (successes === 0) { await this.finish(row.id, 'failed', 'expo_ticket_error'); return; }
      await prisma.notification.update({ where: { id: row.id }, data: { status: 'sent', sent_at: new Date(), locked_at: null, locked_by: null, attempts: { increment: 1 } } });
      await this.markReminderSent(row);
      console.info(JSON.stringify({ event: 'notification.sent', notification_id: row.id }));
    } catch (error: any) {
      const attempt = row.attempts + 1;
      const delay = calculateRetryDelay(attempt, Math.random());
      const errorCode = String(error?.code || error?.message || error?.name || 'expo_delivery_failed').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
      const permanent = /MessageTooBig|InvalidCredentials|MismatchSenderId|DeviceNotRegistered|HTTP_400/.test(errorCode);
      const terminal = permanent || attempt >= config.notifications.maxAttempts;
      await prisma.notification.update({ where: { id: row.id }, data: { status: terminal ? 'failed' : 'pending', attempts: attempt, next_attempt_at: terminal ? null : new Date(Date.now() + delay), locked_at: null, locked_by: null, last_error: errorCode } });
      console.error(JSON.stringify({ event: 'notification.dispatch_failed', notification_id: row.id, attempt, terminal, code: errorCode }));
    }
  }

  private async finish(id: string, status: string, reason: string) {
    await prisma.notification.update({ where: { id }, data: { status, last_error: reason, locked_at: null, locked_by: null } });
    if (status === 'failed') console.error(JSON.stringify({ event: 'notification.failed', notification_id: id, code: reason }));
  }

  private async markReminderSent(row: any) {
    if (row.category !== 'reminders' || !row.source_ref || !['reminder', 'agent_tool'].includes(row.source)) return;
    await prisma.reminder.updateMany({ where: { reminder_id: row.source_ref, recurrence_rule: null }, data: { sent: true, enabled: false } });
  }

  private async runRetentionMaintenance() {
    const cutoff = DateTime.now().minus({ days: config.notifications.retentionDays }).toJSDate();
    await prisma.notificationDelivery.deleteMany({ where: { created_at: { lt: cutoff } } });
    await prisma.notification.deleteMany({ where: { created_at: { lt: cutoff } } });
    await prisma.deviceToken.deleteMany({ where: { disabled_at: { lt: cutoff } } });
  }

  private async recoverStuckRows() {
    const staleBefore = new Date(Date.now() - config.notifications.lockTimeoutMs);
    await prisma.$executeRaw`UPDATE "notifications" SET
      "attempts" = "attempts" + 1,
      "status" = CASE WHEN "attempts" + 1 >= ${config.notifications.maxAttempts} THEN 'failed' ELSE 'pending' END,
      "locked_at" = NULL, "locked_by" = NULL,
      "last_error" = 'stuck_lock_recovered'
      WHERE "status" = 'processing' AND "locked_at" < ${staleBefore}`;
  }

  private async pollReceipts() {
    const cutoff = new Date(Date.now() - config.notifications.receiptDelayMs);
    const rows = await prisma.notificationDelivery.findMany({ where: { receipt_checked_at: null, expo_ticket_id: { not: null }, created_at: { lte: cutoff } }, take: config.notifications.batchSize, include: { device_token: true } });
    const groups = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.expo_ticket_id) continue;
      const group = groups.get(row.expo_ticket_id) || [];
      group.push(row);
      groups.set(row.expo_ticket_id, group);
    }
    if (!groups.size) return;
    try {
      const chunks = this.expo.chunkPushNotificationReceiptIds([...groups.keys()]);
      for (const chunk of chunks) {
        const receipts = await this.expo.getPushNotificationReceiptsAsync(chunk);
        for (const ticketId of chunk) {
          const receipt = receipts[ticketId];
          if (!receipt) continue;
          for (const delivery of groups.get(ticketId) || []) {
            await prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { receipt_status: receipt.status, receipt_checked_at: new Date(), error_code: receipt.status === 'error' ? receipt.details?.error || 'receipt_error' : null } });
            console.info(JSON.stringify({ event: receipt.status === 'ok' ? 'notification.receipt_ok' : 'notification.receipt_error', notification_id: delivery.notification_id, code: receipt.status === 'error' ? receipt.details?.error || 'receipt_error' : undefined }));
            if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
              await prisma.deviceToken.update({ where: { id: delivery.device_token_id }, data: { disabled_at: new Date(), disabled_reason: 'DeviceNotRegistered' } });
              console.info(JSON.stringify({ event: 'notification.token_disabled', notification_id: delivery.notification_id, code: 'DeviceNotRegistered' }));
            }
          }
        }
      }
    } catch (error: any) { console.error(JSON.stringify({ event: 'notification.receipt_poll_failed', code: error?.code || error?.name || 'receipt_poll_error' })); }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
