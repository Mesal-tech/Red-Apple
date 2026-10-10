import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { KickSession, ContractionLog } from '../models/pregnancy.model';

interface PregnancyData {
  kicks: KickSession[];
  contractions: ContractionLog[];
}

class PregnancyStore {
  private kicks: Map<string, KickSession> = new Map();
  private contractions: Map<string, ContractionLog> = new Map();
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    this.filePath = path.join(config.dataDir, 'pregnancy.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const data: PregnancyData = JSON.parse(content);
        if (data.kicks) {
          for (const k of data.kicks) this.kicks.set(k.id, k);
        }
        if (data.contractions) {
          for (const c of data.contractions) this.contractions.set(c.id, c);
        }
      } catch (err) {
        console.error('[PregnancyStore] Failed to parse pregnancy data:', err);
      }
    }

    this.initialized = true;
  }

  private persistSync(): void {
    try {
      const data: PregnancyData = {
        kicks: Array.from(this.kicks.values()),
        contractions: Array.from(this.contractions.values()),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[PregnancyStore] Failed to persist pregnancy data:', err);
    }
  }

  public async addKickSession(userId: string, data: { kick_count: number; duration_minutes: number; notes?: string }): Promise<KickSession> {
    await this.init();
    const session: KickSession = {
      id: `kick_${uuidv4().substring(0, 8)}`,
      user_id: userId,
      kick_count: data.kick_count,
      duration_minutes: data.duration_minutes,
      recorded_at: new Date().toISOString(),
      notes: data.notes,
    };
    this.kicks.set(session.id, session);
    this.persistSync();
    return session;
  }

  public async getKicksByUser(userId: string): Promise<KickSession[]> {
    await this.init();
    return Array.from(this.kicks.values())
      .filter((k) => k.user_id === userId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  }

  public async addContraction(userId: string, data: { duration_seconds: number; frequency_minutes?: number; intensity?: 'mild' | 'moderate' | 'strong' }): Promise<ContractionLog> {
    await this.init();
    const now = new Date().toISOString();
    const log: ContractionLog = {
      id: `cnt_${uuidv4().substring(0, 8)}`,
      user_id: userId,
      start_time: now,
      duration_seconds: data.duration_seconds,
      frequency_minutes: data.frequency_minutes,
      intensity: data.intensity || 'moderate',
      recorded_at: now,
    };
    this.contractions.set(log.id, log);
    this.persistSync();
    return log;
  }

  public async getContractionsByUser(userId: string): Promise<ContractionLog[]> {
    await this.init();
    return Array.from(this.contractions.values())
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());
  }
}

export const pregnancyStore = new PregnancyStore();
