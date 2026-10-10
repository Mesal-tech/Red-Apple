export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';

export interface FertilityPrediction {
  currentDayOfCycle: number;
  currentCycleDay: number;
  currentPhase: CyclePhase;
  daysUntilNextPeriod: number;
  nextPeriodStartDate: string;
  isFertileWindow: boolean;
  fertileWindowStart: string;
  fertileWindowEnd: string;
  estimatedOvulationDate: string;
  chanceOfPregnancy: 'Low' | 'Medium' | 'High' | 'Peak';
  chanceOfGettingPregnant: string;
  cycleLength: number;
  periodDuration: number;
}
