import { DateTime } from 'luxon';
import prisma from '../db/prisma';
import { config } from '../config';
import { notificationService } from './notification.service';
import { assertTimezone, preferencesService } from './preferences.service';

export type ReminderInput = {
  message: string;
  remindAt: string;
  type?: string;
  recurrenceRule?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | null;
  timezone?: string;
};

function parseReminderTime(value: string, timezone: string): DateTime {
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return DateTime.fromISO(value, { setZone: hasOffset, zone: hasOffset ? undefined : timezone });
}

function sanitizeText(value: string): string {
  const clean = value.replace(/<[^>]*>/g, '').trim();
  if (!clean || clean.length > 240) throw new Error('Reminder text must be between 1 and 240 characters.');
  return clean;
}

export const reminderService = {
  async create(userId: string, input: ReminderInput, source: 'agent_tool' | 'reminder' = 'reminder') {
    const preferences = await preferencesService.getOrCreate(userId);
    const timezone = input.timezone || preferences.timezone || config.notifications.defaultTimezone;
    assertTimezone(timezone);
    if (input.type && input.type.length > 40) throw new Error('Reminder type must be at most 40 characters.');
    if (input.recurrenceRule && !['DAILY', 'WEEKLY', 'MONTHLY'].includes(input.recurrenceRule)) throw new Error('Recurrence must be DAILY, WEEKLY, or MONTHLY.');
    const parsed = parseReminderTime(input.remindAt, timezone);
    if (!parsed.isValid) throw new Error('Reminder time is invalid. Provide an ISO 8601 time with a UTC offset, or a local ISO time in the saved timezone.');
    const triggerTime = parsed.toUTC();
    if (triggerTime.toMillis() <= Date.now()) throw new Error('Reminder time must be in the future.');
    const message = sanitizeText(input.message);
    const reminder = await prisma.reminder.create({ data: {
      user_id: userId,
      type: input.type || 'general',
      title: 'Red Apple Reminder',
      body: message,
      trigger_time: triggerTime.toJSDate(),
      timezone,
      recurrence_rule: input.recurrenceRule || null,
      last_enqueued_for: input.recurrenceRule ? null : triggerTime.toJSDate(),
    } });
    if (!input.recurrenceRule) {
      try {
        await notificationService.enqueue({
          userId,
          category: 'reminders',
          title: 'A reminder for you',
          body: message,
          data: { route: 'AIAssistant', seed: 'gentle_checkin', reminder_id: reminder.reminder_id },
          scheduledFor: triggerTime.toJSDate(),
          dedupeKey: `reminder:${reminder.reminder_id}:${triggerTime.toJSDate().toISOString()}`,
          source,
          sourceRef: reminder.reminder_id,
        });
      } catch (error) {
        await prisma.reminder.update({ where: { reminder_id: reminder.reminder_id }, data: { last_enqueued_for: null } });
        throw error;
      }
    }
    return reminder;
  },

  async update(userId: string, reminderId: string, input: ReminderInput) {
    const current = await prisma.reminder.findFirst({ where: { reminder_id: reminderId, user_id: userId } });
    if (!current) throw new Error('Reminder not found.');
    const preferences = await preferencesService.getOrCreate(userId);
    if (input.type && input.type.length > 40) throw new Error('Reminder type must be at most 40 characters.');
    const timezone = input.timezone || current.timezone || preferences.timezone || config.notifications.defaultTimezone;
    assertTimezone(timezone);
    const parsed = parseReminderTime(input.remindAt, timezone);
    if (!parsed.isValid || parsed.toMillis() <= Date.now()) throw new Error('Reminder time must be a valid future time in ISO 8601 format.');
    const triggerTime = parsed.toUTC();
    const message = sanitizeText(input.message);
    if (input.recurrenceRule && !['DAILY', 'WEEKLY', 'MONTHLY'].includes(input.recurrenceRule)) throw new Error('Recurrence must be DAILY, WEEKLY, or MONTHLY.');
    await prisma.notification.updateMany({ where: { source_ref: reminderId, source: { in: ['reminder', 'agent_tool'] }, status: 'pending' }, data: { status: 'cancelled' } });
    const updated = await prisma.reminder.update({ where: { reminder_id: reminderId }, data: {
      body: message,
      type: input.type || current.type,
      timezone,
      trigger_time: triggerTime.toJSDate(),
      recurrence_rule: input.recurrenceRule || null,
      last_enqueued_for: input.recurrenceRule ? null : triggerTime.toJSDate(),
      enabled: true,
      sent: false,
    } });
    if (!input.recurrenceRule) {
      const dedupeKey = `reminder:${reminderId}:${triggerTime.toJSDate().toISOString()}`;
      const notification = await notificationService.enqueue({
        userId,
        category: 'reminders',
        title: 'A reminder for you',
        body: message,
        data: { route: 'AIAssistant', seed: 'gentle_checkin', reminder_id: reminderId },
        scheduledFor: triggerTime.toJSDate(),
        dedupeKey,
        source: 'reminder',
        sourceRef: reminderId,
      });
      if (notification.status === 'cancelled' || notification.status === 'failed') {
        await prisma.notification.update({ where: { id: notification.id }, data: { status: 'pending', attempts: 0, next_attempt_at: null, last_error: null, scheduled_for: triggerTime.toJSDate() } });
      }
    }
    return updated;
  },

  async list(userId: string) {
    return prisma.reminder.findMany({ where: { user_id: userId }, orderBy: { trigger_time: 'asc' } });
  },

  async cancel(userId: string, reminderId: string) {
    const result = await prisma.reminder.updateMany({ where: { reminder_id: reminderId, user_id: userId, enabled: true }, data: { enabled: false } });
    if (!result.count) throw new Error('Reminder not found.');
    await prisma.notification.updateMany({ where: { source_ref: reminderId, source: { in: ['reminder', 'agent_tool'] }, status: 'pending' }, data: { status: 'cancelled' } });
    return { reminderId, cancelled: true };
  },
};
