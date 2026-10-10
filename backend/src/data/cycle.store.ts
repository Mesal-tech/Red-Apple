import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export interface CycleLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  isPeriodDay?: boolean;
  flowIntensity?: 'Light' | 'Medium' | 'Heavy' | 'Spotting' | 'None' | string;
  feeling?: string; // 'Great', 'Normal', 'Tired', 'Sad', 'Crampy', etc.
  symptoms?: string[]; // e.g. ['Cramps', 'Fatigue', 'Bloating']
  basalTemperature?: number;
  notes?: string;
  created_at: string;
}

export interface UserCycleStats {
  totalLogs: number;
  averageCycleLength: number;
  averagePeriodDuration: number;
  symptomFrequencies: { name: string; percentage: number; count: number }[];
  recentCycleLengths: { month: string; value: number }[];
  dominantFlow: string;
}

class CycleStore {
  private logs: Map<string, CycleLog> = new Map();
  private filePath: string;
  private initialized: boolean = false;

  constructor() {
    this.filePath = path.join(config.dataDir, 'cycles.json');
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.filePath)) {
      try {
        const content = fs.readFileSync(this.filePath, 'utf-8');
        const list: CycleLog[] = JSON.parse(content);
        for (const item of list) {
          this.logs.set(item.id, item);
        }
      } catch (err) {
        console.error('Failed to parse cycles file, re-initializing...', err);
        this.seedDefaults();
      }
    } else {
      this.seedDefaults();
    }

    this.initialized = true;
  }

  private seedDefaults(): void {
    // Seed default sample history for Amara Okonkwo anchored to her profile lastPeriodDate
    const lastPeriod = new Date(Date.now() - 12 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const defaultLogs: CycleLog[] = [];
    const flowLevels: CycleLog['flowIntensity'][] = ['Heavy', 'Heavy', 'Medium', 'Light', 'Light'];

    for (let day = 0; day < 5; day++) {
      const d = new Date(lastPeriod);
      d.setDate(lastPeriod.getDate() + day);
      const dStr = formatDate(d);
      defaultLogs.push({
        id: `log_seed_${day + 1}`,
        user_id: 'usr_amara_default_01',
        date: dStr,
        startDate: formatDate(lastPeriod),
        endDate: formatDate(new Date(lastPeriod.getTime() + 4 * 24 * 60 * 60 * 1000)),
        isPeriodDay: true,
        flowIntensity: flowLevels[day],
        feeling: day < 2 ? 'Crampy' : 'Good',
        symptoms: [],
        created_at: `${dStr}T08:00:00.000Z`,
      });
    }

    for (const log of defaultLogs) {
      this.logs.set(log.id, log);
    }
    this.persistSync();
  }

  private persistSync(): void {
    const list = Array.from(this.logs.values());
    fs.writeFileSync(this.filePath, JSON.stringify(list, null, 2), 'utf-8');
  }

  public async saveLog(logData: Partial<CycleLog> & { user_id: string; date: string }): Promise<CycleLog> {
    await this.init();

    // Look for existing log on this date for this user
    let existing: CycleLog | undefined;
    for (const l of this.logs.values()) {
      if (l.user_id === logData.user_id && l.date === logData.date) {
        existing = l;
        break;
      }
    }

    const log: CycleLog = {
      id: existing ? existing.id : (logData.id || `log_${uuidv4()}`),
      user_id: logData.user_id,
      date: logData.date,
      startDate: logData.startDate || existing?.startDate,
      endDate: logData.endDate || existing?.endDate,
      isPeriodDay: logData.isPeriodDay !== undefined ? logData.isPeriodDay : existing?.isPeriodDay,
      flowIntensity: logData.flowIntensity || existing?.flowIntensity || 'None',
      feeling: logData.feeling || existing?.feeling,
      symptoms: logData.symptoms || existing?.symptoms || [],
      basalTemperature: logData.basalTemperature || existing?.basalTemperature,
      notes: logData.notes || existing?.notes,
      created_at: existing ? existing.created_at : new Date().toISOString(),
    };

    this.logs.set(log.id, log);
    this.persistSync();
    return log;
  }

  public async getLogsByUser(userId: string): Promise<CycleLog[]> {
    await this.init();
    return Array.from(this.logs.values())
      .filter((l) => l.user_id === userId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public async getUserCycleStats(userId: string, baselineCycleLength = 28, baselinePeriodDuration = 5): Promise<UserCycleStats> {
    const userLogs = await this.getLogsByUser(userId);

    // Calculate symptom frequencies
    const symptomCounts: Record<string, number> = {};
    let totalSymptomInstances = 0;

    userLogs.forEach((log) => {
      if (Array.isArray(log.symptoms)) {
        log.symptoms.forEach((s) => {
          symptomCounts[s] = (symptomCounts[s] || 0) + 1;
          totalSymptomInstances++;
        });
      }
    });

    const symptomFrequencies = Object.keys(symptomCounts)
      .map((name) => ({
        name,
        count: symptomCounts[name],
        percentage: userLogs.length > 0 ? Math.round((symptomCounts[name] / userLogs.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Find dominant flow
    const flowCounts: Record<string, number> = {};
    userLogs.forEach((l) => {
      if (l.flowIntensity && l.flowIntensity !== 'None') {
        flowCounts[l.flowIntensity] = (flowCounts[l.flowIntensity] || 0) + 1;
      }
    });
    const dominantFlow = Object.keys(flowCounts).sort((a, b) => flowCounts[b] - flowCounts[a])[0] || 'Normal Flow';

    // Generate month history anchored to recent months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const recentCycleLengths: { month: string; value: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mName = monthNames[d.getMonth()];
      recentCycleLengths.push({
        month: mName,
        value: baselineCycleLength,
      });
    }

    return {
      totalLogs: userLogs.length,
      averageCycleLength: baselineCycleLength,
      averagePeriodDuration: baselinePeriodDuration,
      symptomFrequencies,
      recentCycleLengths,
      dominantFlow,
    };
  }
}

export const cycleStore = new CycleStore();
