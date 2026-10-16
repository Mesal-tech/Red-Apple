import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/prisma';

export interface CycleLog {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  startDate?: string;
  endDate?: string;
  isPeriodDay?: boolean;
  flowIntensity?: 'Light' | 'Medium' | 'Heavy' | 'Spotting' | 'None' | string;
  feeling?: string;
  symptoms?: string[];
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

function mapPrismaCycleLog(l: any): CycleLog {
  const dStr = l.start_date instanceof Date
    ? l.start_date.toISOString().split('T')[0]
    : String(l.start_date).split('T')[0];

  const endStr = l.end_date
    ? (l.end_date instanceof Date ? l.end_date.toISOString().split('T')[0] : String(l.end_date).split('T')[0])
    : undefined;

  let symptomsArray: string[] = [];
  if (Array.isArray(l.symptoms)) {
    symptomsArray = l.symptoms;
  } else if (typeof l.symptoms === 'string') {
    try {
      symptomsArray = JSON.parse(l.symptoms);
    } catch (_) {
      symptomsArray = [];
    }
  }

  return {
    id: l.log_id,
    user_id: l.user_id,
    date: dStr,
    startDate: dStr,
    endDate: endStr,
    isPeriodDay: l.is_period_day,
    flowIntensity: l.flow_intensity || undefined,
    symptoms: symptomsArray,
    notes: l.notes || undefined,
    created_at: l.created_at ? new Date(l.created_at).toISOString() : new Date().toISOString(),
  };
}

class CycleStore {
  public async init(): Promise<void> {
    // Pure PostgreSQL / Prisma backed store. No mock files or seeds.
    return Promise.resolve();
  }

  public async saveLog(
    logData: Partial<CycleLog> & { user_id: string; date: string }
  ): Promise<CycleLog> {
    const targetDate = new Date(`${logData.date}T00:00:00.000Z`);
    const endDate = logData.endDate ? new Date(`${logData.endDate}T00:00:00.000Z`) : null;

    // Check for existing log for user on this date
    const existing = await prisma.cycleLog.findFirst({
      where: {
        user_id: logData.user_id,
        start_date: targetDate,
      },
    });

    if (existing) {
      const updated = await prisma.cycleLog.update({
        where: { log_id: existing.log_id },
        data: {
          end_date: endDate,
          flow_intensity: logData.flowIntensity || existing.flow_intensity,
          is_period_day: logData.isPeriodDay !== undefined ? logData.isPeriodDay : existing.is_period_day,
          symptoms: logData.symptoms || (existing.symptoms as any),
          notes: logData.notes !== undefined ? logData.notes : existing.notes,
        },
      });
      return mapPrismaCycleLog(updated);
    }

    const created = await prisma.cycleLog.create({
      data: {
        log_id: `log_${uuidv4().substring(0, 8)}`,
        user_id: logData.user_id,
        start_date: targetDate,
        end_date: endDate,
        flow_intensity: logData.flowIntensity || 'Medium',
        is_period_day: logData.isPeriodDay !== undefined ? logData.isPeriodDay : true,
        symptoms: logData.symptoms || [],
        notes: logData.notes || null,
      },
    });

    return mapPrismaCycleLog(created);
  }

  public async getLogsByUser(userId: string): Promise<CycleLog[]> {
    const logs = await prisma.cycleLog.findMany({
      where: { user_id: userId },
      orderBy: { start_date: 'asc' },
    });

    return logs.map(mapPrismaCycleLog);
  }

  public async getUserCycleStats(
    userId: string,
    baselineCycleLength = 28,
    baselinePeriodDuration = 5
  ): Promise<UserCycleStats> {
    const logs = await this.getLogsByUser(userId);

    if (logs.length === 0) {
      return {
        totalLogs: 0,
        averageCycleLength: baselineCycleLength,
        averagePeriodDuration: baselinePeriodDuration,
        symptomFrequencies: [],
        recentCycleLengths: [
          { month: 'Last', value: baselineCycleLength },
          { month: 'Prev', value: baselineCycleLength },
        ],
        dominantFlow: 'Medium',
      };
    }

    const symptomCount: Record<string, number> = {};
    const flowCount: Record<string, number> = {};

    for (const log of logs) {
      for (const s of log.symptoms || []) {
        symptomCount[s] = (symptomCount[s] || 0) + 1;
      }
      if (log.flowIntensity) {
        flowCount[log.flowIntensity] = (flowCount[log.flowIntensity] || 0) + 1;
      }
    }

    const totalLogs = logs.length;
    const symptomFrequencies = Object.entries(symptomCount)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / totalLogs) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    let dominantFlow = 'Medium';
    let maxFlowCount = 0;
    for (const [flow, count] of Object.entries(flowCount)) {
      if (count > maxFlowCount) {
        maxFlowCount = count;
        dominantFlow = flow;
      }
    }

    return {
      totalLogs,
      averageCycleLength: baselineCycleLength,
      averagePeriodDuration: baselinePeriodDuration,
      symptomFrequencies,
      recentCycleLengths: [
        { month: 'Recent', value: baselineCycleLength },
      ],
      dominantFlow,
    };
  }
}

export const cycleStore = new CycleStore();
