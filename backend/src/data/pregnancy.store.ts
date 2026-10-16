import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';
import { KickSession, ContractionLog } from '../models/pregnancy.model';

class PregnancyStore {
  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public async addKickSession(
    userId: string,
    data: { kick_count: number; duration_minutes: number; notes?: string }
  ): Promise<KickSession> {
    const session: KickSession = {
      id: uuidv4(),
      user_id: userId,
      kick_count: data.kick_count,
      duration_minutes: data.duration_minutes,
      recorded_at: new Date().toISOString(),
      notes: data.notes,
    };

    let tracker = await prisma.pregnancyTracker.findUnique({
      where: { user_id: userId },
    });

    if (!tracker) {
      tracker = await prisma.pregnancyTracker.create({
        data: {
          tracker_id: `trk_${uuidv4().substring(0, 8)}`,
          user_id: userId,
          kick_sessions: [session as any],
          contraction_logs: [],
        },
      });
    } else {
      const existingKicks = Array.isArray(tracker.kick_sessions)
        ? (tracker.kick_sessions as any[])
        : [];
      existingKicks.unshift(session);

      await prisma.pregnancyTracker.update({
        where: { user_id: userId },
        data: { kick_sessions: existingKicks },
      });
    }

    return session;
  }

  public async getKicksByUser(userId: string): Promise<KickSession[]> {
    const tracker = await prisma.pregnancyTracker.findUnique({
      where: { user_id: userId },
    });
    if (!tracker || !tracker.kick_sessions) return [];
    return Array.isArray(tracker.kick_sessions) ? (tracker.kick_sessions as any[]) : [];
  }

  public async addContraction(
    userId: string,
    data: { duration_seconds: number; frequency_minutes?: number; intensity?: 'mild' | 'moderate' | 'strong' }
  ): Promise<ContractionLog> {
    const now = new Date().toISOString();
    const contraction: ContractionLog = {
      id: uuidv4(),
      user_id: userId,
      start_time: now,
      duration_seconds: data.duration_seconds,
      frequency_minutes: data.frequency_minutes,
      intensity: data.intensity || 'moderate',
      recorded_at: now,
    };

    let tracker = await prisma.pregnancyTracker.findUnique({
      where: { user_id: userId },
    });

    if (!tracker) {
      tracker = await prisma.pregnancyTracker.create({
        data: {
          tracker_id: `trk_${uuidv4().substring(0, 8)}`,
          user_id: userId,
          kick_sessions: [],
          contraction_logs: [contraction as any],
        },
      });
    } else {
      const existingContractions = Array.isArray(tracker.contraction_logs)
        ? (tracker.contraction_logs as any[])
        : [];
      existingContractions.unshift(contraction);

      await prisma.pregnancyTracker.update({
        where: { user_id: userId },
        data: { contraction_logs: existingContractions },
      });
    }

    return contraction;
  }

  public async getContractionsByUser(userId: string): Promise<ContractionLog[]> {
    const tracker = await prisma.pregnancyTracker.findUnique({
      where: { user_id: userId },
    });
    if (!tracker || !tracker.contraction_logs) return [];
    return Array.isArray(tracker.contraction_logs) ? (tracker.contraction_logs as any[]) : [];
  }
}

export const pregnancyStore = new PregnancyStore();
