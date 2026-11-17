import { DateTime } from 'luxon';
import prisma from '../db/prisma';
import { config } from '../config';

export type PreferencePatch = {
  enabled?: boolean;
  timezone?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  tone?: 'cheeky' | 'gentle';
  discreet_mode?: boolean;
  categories?: Record<string, boolean>;
  max_per_day?: number;
};

const validTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function assertTimezone(zone: string): void {
  if (!DateTime.now().setZone(zone).isValid) throw new Error('timezone must be a valid IANA timezone');
}

export const preferencesService = {
  async getOrCreate(userId: string) {
    return prisma.notificationPreference.upsert({
      where: { user_id: userId },
      update: {},
      create: {
        user_id: userId,
        timezone: config.notifications.defaultTimezone,
        quiet_hours_start: config.notifications.defaultQuietStart,
        quiet_hours_end: config.notifications.defaultQuietEnd,
        max_per_day: config.notifications.maxPerDay,
      },
    });
  },
  async update(userId: string, patch: PreferencePatch) {
    if (patch.timezone) assertTimezone(patch.timezone);
    for (const value of [patch.quiet_hours_start, patch.quiet_hours_end]) {
      if (value !== undefined && !validTime(value)) throw new Error('Quiet hours must use HH:mm local time');
    }
    if (patch.tone !== undefined && !['cheeky', 'gentle'].includes(patch.tone)) throw new Error('tone must be gentle or cheeky');
    if (patch.max_per_day !== undefined && (!Number.isInteger(patch.max_per_day) || patch.max_per_day < 1 || patch.max_per_day > 20)) {
      throw new Error('max_per_day must be between 1 and 20');
    }
    await this.getOrCreate(userId);
    return prisma.notificationPreference.update({ where: { user_id: userId }, data: patch });
  },
};
