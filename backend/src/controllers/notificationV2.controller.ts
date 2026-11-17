import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { deviceTokensService } from '../notifications/deviceTokens.service';
import { preferencesService } from '../notifications/preferences.service';
import prisma from '../db/prisma';
import { reminderService } from '../notifications/reminder.service';
import { getStreakSummary, restoreUnifiedStreak } from '../notifications/streak.service';

const registrationSchema = z.object({
  token: z.string().min(1).max(512),
  platform: z.enum(['ios', 'android']),
  deviceName: z.string().max(120).optional(),
  appVersion: z.string().max(40).optional(),
  osVersion: z.string().max(40).optional(),
});

const preferenceSchema = z.object({
  enabled: z.boolean().optional(),
  timezone: z.string().max(100).optional(),
  quiet_hours_start: z.string().max(5).optional(),
  quiet_hours_end: z.string().max(5).optional(),
  tone: z.enum(['cheeky', 'gentle']).optional(),
  discreet_mode: z.boolean().optional(),
  categories: z.record(z.string(), z.boolean()).optional(),
  max_per_day: z.number().int().optional(),
}).strict();

const reminderSchema = z.object({
  message: z.string().min(1).max(240),
  remindAt: z.string().min(1).max(80),
  type: z.string().max(40).optional(),
  recurrenceRule: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).nullable().optional(),
  timezone: z.string().max(100).optional(),
}).strict();

const streakActivitySchema = z.object({
  kind: z.enum(['daily_checkin', 'symptom_checkin']),
}).strict();

function userId(req: AuthenticatedRequest): string | null { return req.user?.userId || null; }
function badRequest(res: Response, error: unknown) {
  return res.status(400).json({ success: false, message: error instanceof Error ? error.message : 'Invalid request.' });
}

export async function registerDeviceV2(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message);
    await deviceTokensService.registerDevice(id, parsed.data);
    await preferencesService.getOrCreate(id);
    return res.json({ success: true });
  } catch (error) { return badRequest(res, error); }
}

export async function unregisterDeviceV2(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const parsed = z.object({ token: z.string().min(1).max(512) }).safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message);
    await deviceTokensService.unregisterDevice(id, parsed.data.token);
    return res.json({ success: true });
  } catch (error) { return next(error); }
}

export async function getNotificationPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    return res.json({ success: true, preferences: await preferencesService.getOrCreate(id) });
  } catch (error) { return next(error); }
}

export async function updateNotificationPreferences(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const parsed = preferenceSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message);
    return res.json({ success: true, preferences: await preferencesService.update(id, parsed.data) });
  } catch (error) { return badRequest(res, error); }
}

export async function getNotificationHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const rows = await prisma.notification.findMany({ where: { user_id: id }, orderBy: { created_at: 'desc' }, take: limit + 1, ...(typeof req.query.cursor === 'string' ? { cursor: { id: req.query.cursor }, skip: 1 } : {}) });
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit);
    return res.json({ success: true, notifications: items, nextCursor: hasMore ? items[items.length - 1]?.id : null });
  } catch (error) { return next(error); }
}

export async function getUserStreak(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    return res.json({ success: true, streak: await getStreakSummary(id) });
  } catch (error) { return next(error); }
}

export async function recordStreakActivity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const parsed = streakActivitySchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message);
    await prisma.checkInActivity.create({ data: { user_id: id, kind: parsed.data.kind } });
    return res.status(201).json({ success: true });
  } catch (error) { return next(error); }
}

export async function restoreUserStreak(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const result = await restoreUnifiedStreak(id);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) { return next(error); }
}

export async function markNotificationOpened(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const row = await prisma.notification.findFirst({ where: { id: req.params.id, user_id: id }, select: { id: true, opened_at: true } });
    if (!row) return res.status(404).json({ success: false, message: 'Notification not found.' });
    if (!row.opened_at) await prisma.notification.updateMany({ where: { id: row.id, user_id: id, opened_at: null }, data: { opened_at: new Date() } });
    return res.json({ success: true });
  } catch (error) { return next(error); }
}

export async function listUserReminders(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    return res.json({ success: true, reminders: await reminderService.list(id) });
  } catch (error) { return next(error); }
}

export async function createUserReminder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const parsed = reminderSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message);
    const reminder = await reminderService.create(id, parsed.data, 'reminder');
    return res.status(201).json({ success: true, reminder });
  } catch (error) { return badRequest(res, error); }
}

export async function updateUserReminder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    const parsed = reminderSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, parsed.error.issues[0]?.message);
    const reminder = await reminderService.update(id, req.params.id, parsed.data);
    return res.json({ success: true, reminder });
  } catch (error) { return badRequest(res, error); }
}

export async function deleteUserReminder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const id = userId(req); if (!id) return res.status(401).json({ success: false, message: 'Authentication required.' });
    return res.json({ success: true, ...(await reminderService.cancel(id, req.params.id)) });
  } catch (error) { return badRequest(res, error); }
}
